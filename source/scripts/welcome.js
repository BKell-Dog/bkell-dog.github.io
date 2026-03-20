function updateBackground(backgrounds) {
	let d = new Date();
	let hour = d.getHours();
	let background = document.getElementById("background-image");
	
	let timeOfDay;
	switch (true) {
		case (hour < 5 || hour >= 20):  timeOfDay = "nighttime";    break;
		case (hour >= 5  && hour < 7):  timeOfDay = "earlySunrise";  break;
		case (hour >= 7  && hour < 9):  timeOfDay = "lateSunrise";   break;
		case (hour >= 9  && hour < 11): timeOfDay = "morning";       break;
		case (hour >= 11 && hour < 15): timeOfDay = "day";           break;
		case (hour >= 15 && hour < 17): timeOfDay = "afternoon";     break;
		case (hour >= 17 && hour < 19): timeOfDay = "earlySunset";   break;
		case (hour >= 19 && hour < 20): timeOfDay = "lateSunset";    break;
		default:                        timeOfDay = "day";
	}

	const pool = backgrounds[timeOfDay];
	if (!pool || pool.length === 0) {
		console.warn("No backgrounds found for: " + timeOfDay);
		return;
	}

	// Choose random background image from pre-made list
	const chosen = pool[Math.floor(Math.random() * pool.length)];
	document.getElementById("background-image").style.backgroundImage = "url(" + chosen + ")";
}

window.onload = function () {
	// Background images are pre-loaded into a manifest file during site deployment.
	// Load the manifest, then set the background
	fetch("/assets/backgrounds.json")
		.then((res) => res.json())
		.then((backgrounds) => updateBackground(backgrounds))
		.catch((err) => console.error("Could not load backgrounds.json:", err));

	// Initiate typewriter effect
	var elements = document.getElementsByClassName("typewrite");
	for (var i = 0; i < elements.length; i++) {
		var toRotate = elements[i].getAttribute("data-type");
		var period = elements[i].getAttribute("data-period");
		if (toRotate) {
			new TxtType(elements[i], JSON.parse(toRotate), period);
		}
	}

	// Inject CSS
	var css = document.createElement("style");
	css.type = "text/css";
	css.innerHTML = ".typewrite > .wrap { border-right: 0.08em solid #fff }";
	document.body.appendChild(css);
};

// JS typewriter from https://codepen.io/hi-im-si/pen/ALgzqo
var TxtType = function(el, toRotate, period) {
    this.toRotate = toRotate;
    this.el = el;
    this.loopNum = 0;
    this.period = parseInt(period, 10) || 2000;
    this.txt = '';
    this.tick();
    this.isDeleting = false;
};

TxtType.prototype.tick = function() {
    var i = this.loopNum % this.toRotate.length;
    var fullTxt = this.toRotate[i];

    if (this.isDeleting) {
    this.txt = fullTxt.substring(0, this.txt.length - 1);
    } else {
    this.txt = fullTxt.substring(0, this.txt.length + 1);
    }

    this.el.innerHTML = '<span class="wrap">'+this.txt+'</span>';

    var that = this;
    var delta = 200 - Math.random() * 100;

    if (this.isDeleting) { delta /= 2; }

    if (!this.isDeleting && this.txt === fullTxt) {
    delta = this.period;
    this.isDeleting = true;
    } else if (this.isDeleting && this.txt === '') {
    this.isDeleting = false;
    this.loopNum++;
    delta = 500;
    }

    setTimeout(function() {
    that.tick();
    }, delta);
};