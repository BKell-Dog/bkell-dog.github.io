---
title: Web Pages for the Few
description: Secret Webpages using Custom TLS Certificates
author: Will Kelly
date: 2026-06-11
---

I wanted to publicly expose a webpage with sensitive information on it, information which should only be read by a few select people using a handful of devices. Therefore, I need a way to separate each person I've whitelisted from everyone else, and give one webpage to the whitelisted user, and a 404 to everyone else. A simple solution exists: I will use mTLS (mutual TLS). By preloading the whitelisted user's devices with a premade TLS client certificate, the user's browser will present it upon connection during TLS handshake; this certificate can then be parsed by the server, and based on what it receives the server can serve different pages. A missing or wrong certificate will be served nothing or a 404. It will also be difficult for malicious actors to steal a client certificate which is loaded onto end-device local memory and stored in the OS keychain.

## The Theory
### Certificate Authorities
A TLS connection secures itself using public and private keypairs to encrypt traffic. A problem arises when a client and server go to exchange keys: how does the client know that the public key it receives is really from the intended server, and not a man-in-the-middle? To verify the key, the client and server both refer to a 3rd party Certificate Authority (CA) which they both trust (which in practice is a nonprofit like [Let's Encrypt](https://letsencrypt.org/)). The CA will use the server's public key and its own private key to create a certificate, and since the server's public key is encrypted with the CA's private key, only the CA's public key can decrypt the certificate to reveal the server's public key. The client is able to get the CA's public key on its own, without referring to whatever message he got from the (possibly malicious) server connection. In that way the client can verify the server's public key by trusting a known 3rd party.

Anyone can be a CA, but there are very few CAs that are trusted commonly by everyone. However, if I own the server and the client, then I can instruct both sides to trust whatever CA I choose, even one that I create. So let's create a certificate authority and make our own TLS certificates.

### A Client Certificate
Usually in web communications the server is the one authenticating to the client, the client usually doesn't matter, it could be anyone. But we have the option to request the client to present a certificate of its own. So in addition to the client asking the server "How do I know you're who you say you are?", we can also have the server ask back to the client, "But how do I know **you** are who you say you are?" If the client is prompted for a certificate, it usually has a small store of its own certificates built into the OS, but I can add one of my own, and any certs I add will be **per device**, not per browser like a cookie.

Then since I also control the server via an [Nginx](https://nginx.org/en/) reverse proxy, I can configure the server to check the client certificate against a CA of my choosing, and if the client presents a valid cert, I can serve it the requested webpage. Otherwise I can serve a 404, or a completely different webpage.

## How It's Done
### Step 1: Set Up a New Certificate Authority
A CA is really just a public/private key pair which is used to create certificates; the public key is also used later to check the validity of certificates. So a CA is actually very easy to create.

First create the appropriate folder to store the CA certificates and client certificates.

```sh
mkdir -p /some/path/to/nginx/mtls/{ca,clients}
cd /some/path/to/nginx/mtls
```

Note that in this example, I created the CA inside the config folder for my Nginx instance.

Next generate a public-private key pair, and transform it to a CA certificate. The `genrsa` command will prompt for a password - this is the master password for the entire cert which will be requested multiple times later. Pick something strong and memorable.

```sh
# Create key pair
openssl genrsa -aes256 -out ca/ca.key 4096

# Use key pair to create certificate
openssl req -new -x509 -days 3650 -key ca/ca.key -out ca/ca.crt  -subj "/CN=Kelly CA/O=My Org/C=US"
```

The CN and Org name are not strictly important, they can be anything. At this point ca.key is the private key that can issue client certificates. As such it should be kept offline and secure, only used for renewing client certs or creating new ones. ca.crt goes on the server.

### Step 2: Create Client Certificates

First, we must create a private key for each new client. I will show the creation of one for a client called 'laptop'.

```sh
# Generate client private key
openssl genrsa -out clients/laptop.key 2048

# Use key to create a certificate signing request (CSR)
openssl req -new -key clients/laptop.key -out clients/laptop.csr -subj "/CN=My Laptop/O=My Org/C=US"

# Submit this signing request to the CA and form a new client certificate
# This uses the x509 standard, creates a valid cert for 365 days, and instructs the CA on how to track this new cert.
openssl x509 -req -days 365 -in clients/laptop.csr -CA ca/ca.crt -CAkey ca/ca.key -CAcreateserial -out clients/laptop.crt
```

Just like that we have a new client certificate, here called `laptop.crt`, which can be installed on the client device. We should also package the cert into a .p12 file, just for ease on installation. This .p12 file will bundle together the new client cert, `laptop.crt`, and laptop private key, `laptop.key`, and the CA's public certificate, `ca.crt`. Clients need all three of these in order to successfully complete the TLS handshake with this new cert.

```sh
openssl pkcs12 -export -in clients/laptop.crt -inkey clients/laptop.key -certfile ca/ca.crt -out clients/laptop.p12 -name "My Laptop"
```

This command will prompt you for an "export password," which will be used to encrypt the bundled file contents. Note that if you intend to open this .p12 file on an Android phone, you should append the flag `-legacy` to this command. Android only accepts this file when it's encrypted with the older RC2/3DES algorithm, not the newer AES-256 algorithm which is the default.
### Step 3: Installing the New Certificate

I created this .p12 file on my server next to my Nginx config files, so I quickly copied it to my local computer over SSH:

```sh
scp user@server.ip.address:/some/path/to/nginx/mtls/clients/laptop.p12 /path/to/destination/folder/
```

Once on the desired client device, usually all you have to do is try to open a .p12 file for the OS to recognize it as a new TLS certificate and ask if you want to add it to the keychain. This worked for me on Windows and Android. Good browsers, too, will pick up on this new certificate and ask if you want to use it when connecting to your secret webpage. As far as I've tested, only Duckduckgo browser on Android won't pull certificates from the OS keystore, probably for privacy reasons since sending a client cert is a major act of self-identification.

## Conclusion
Now you have a Website for the Few, specifically for whomever you decide to distribute certificates to. It works automatically, with no complicated backend needed, built into TLS with no moving parts. Do what you will with that.