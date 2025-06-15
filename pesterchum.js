///////////////////////////
// PESTERCHUM FORMATTING //
///////////////////////////

var PstartString = "pchumStart_flaringKisCool"
var PendString = "pchumEnd_flaringKisCool"

let applyPesterchum = () => {

	// Check options
	var ignorePchumLinebreaks = document.getElementById("pchumlb").checked
	var arrowremove = document.getElementById("arrowremove").checked

	// Correction
	fileOutput.innerHTML = fileOutput.innerHTML.replaceAll("<br>", "</span></p><p><span>")
	fileOutput.appendChild(document.createElement("p"))

	var paragraphs = fileOutput.querySelectorAll("p, h1, h2, h3, h4, h5, h6")

	// Add pchum start and end
	let addPchumStart = pIndex => {
		var pchumStart = document.createElement("div")
		var pspan = document.createElement('span')
		pchumStart.classList = "pchumStart"
		pspan.innerText = PstartString

		pchumStart.appendChild(pspan)
		paragraphs[pIndex].before(pchumStart)
	}
	let addPchumEnd = pIndex => {
		var pchumEnd = document.createElement("div")
		var pspan = document.createElement('span')
		pchumEnd.classList = "pchumEnd"
		pspan.innerText = PendString

		pchumEnd.appendChild(pspan)
		paragraphs[pIndex].before(pchumEnd)
	}

	// Check if p is message or notification
	let isPchumMessage = (pIndex, indentCheck) => {
		var p = paragraphs[pIndex]
		return pesterchum[p.innerText.substring(indentCheck ? 2 : 0, p.innerText.indexOf(":"))]
	}
	let isPchumNotifcation = (pIndex, indentCheck) => {
		var p = paragraphs[pIndex]
		return (p.innerText.substring(indentCheck ? 2 : 0, 2) == "--" || p.innerText[indentCheck ? 2 : 0] == "–") &&
			(p.innerText.substring(p.innerText.length - 2, p.innerText.length) == "--" || p.innerText[p.innerText.length - 1] == "–") &&
			p.innerText.includes(" ")
	}

	//Remvoe paragraphs
	if (arrowremove) {
		for (let i = 0; i < paragraphs.length; i++) {
			if (paragraphs[i].innerText.substring(0, 2) == "> " || paragraphs[i].innerText.substring(0, 2) == "*> ") {
				paragraphs[i].innerHTML = paragraphs[i].innerHTML.replace("&gt; ", "").replace("*&gt; ", "")
				if (!paragraphs[i].innerText.includes(":")) {
					paragraphs[i].innerHTML = "<span>-- </span>" + paragraphs[i].innerHTML + "<span> --</span>"
				}
			}
		}
	}

	paragraphs = fileOutput.querySelectorAll("p, h1, h2, h3, h4, h5, h6")

	// Format each paragraph
	var was_pchum = false
	var is_pchum = false
	for (let i = 0; i < paragraphs.length; i++) {
		var p = paragraphs[i]
		was_pchum = is_pchum
		is_pchum = false

		// if the handle is logged give a color
		if (isPchumMessage(i)) {
			var handle = p.innerText.substring(0, p.innerText.indexOf(":"))
			var chumColor = pesterchum[handle].color
			var chumHandle = handle
			var is_quote = false

			//check for quote
			for (const [key, value] of Object.entries(pesterchum)) {
				if (p.innerText.includes(handle + ": " + key + ":")) {
					is_quote = true
					p.innerHTML = p.innerHTML.replace(handle + ": ", "")
					chumColor = value.color
					chumHandle = key
				}
			}

			var spans = p.querySelectorAll("span")
			spans.forEach(span => {
				span.classList += chumHandle
				span.style.color = chumColor
				span.style.fontFamily = "Courier New"
				span.style.fontWeight = "600"
			})

			if (is_quote) {
				var spanHandle = document.createElement("span")
				spanHandle.innerText = handle + ": "
				spanHandle.style.color = pesterchum[handle].color
				spanHandle.style.fontFamily = "Courier New"
				spanHandle.style.fontWeight = "600"
				spanHandle.classList = handle
				p.prepend(spanHandle)
			}

			p.innerHTML = p.innerHTML.replaceAll("~:", ":")

			p.classList += " pchum"
			is_pchum = true
		}

		// If handle is notification (Has -- at the start and end)
		if (isPchumNotifcation(i)) {

			p.classList += " pchum"

			p.style.fontFamily = "Courier New !important"
			p.style.fontWeight = "600 !important"

			p.innerHTML = p.innerHTML.replaceAll("–", "--")
			for (const [key, value] of Object.entries(pesterchum)) {
				p.innerHTML = p.innerHTML.replaceAll(" " + key, key)
				p.innerHTML = p.innerHTML.replaceAll(key + " ", key)
				p.innerHTML = p.innerHTML.replaceAll(" " + key + " ", " " + value.handle + " [" + key + "] ")
				p.innerHTML = p.innerHTML.replaceAll(" [" + key + "] ", "</span> <span class='notif" + key + "' style='color:" + value.color + "'>[" + key + "]</span><span> ")
				p.innerHTML = p.innerHTML.replaceAll("~]", "]")
			}

			var spans = p.querySelectorAll("span")
			spans.forEach(span => {
				span.style.fontFamily = "Courier New"
				span.style.fontWeight = "600"
			})

			p.classList += " pchum"
			is_pchum = true
		}

		// Create end or start
		if (was_pchum !== is_pchum) {
			if (is_pchum) {
				addPchumStart(i)
			} else {
				addPchumEnd(i)
			}
		}

		// If ignorePchumLinebreaks remove blank ps between messages
		if (ignorePchumLinebreaks && i < paragraphs.length - 1) {
			if (is_pchum && paragraphs[i + 1].innerText == "" && (isPchumMessage(i + 2) || isPchumMessage(i + 2, true) || isPchumNotifcation(i + 2) || isPchumNotifcation(i + 2, true))) {
				paragraphs[i + 1].remove()
				paragraphs = fileOutput.querySelectorAll("p, h1, h2, h3, h4, h5, h6")
			}
		}
	}
}

///////////////////////
// CUSTOM CHARACTERS //
///////////////////////

let addChar = (inputName, inputColor) => {
	var charWrap = document.getElementById("customChars")

	var div = document.createElement("div")

	var name = document.createElement("input")
	name.placeholder = "Enter name"
	name.oninput = () => {
		name.value = name.value.toUpperCase()
	}
	name.id = "chumName"
	if (inputName) {
		name.value = inputName
	}

	var color = document.createElement("input")
	color.type = "color"
	color.id = "chumColor"
	if (inputColor) {
		color.value = inputColor
	}

	var removeBtn = document.createElement("button")
	removeBtn.innerText = "X"
	removeBtn.onclick = () => {
		removeBtn.parentNode.remove()
	}

	div.appendChild(name)
	div.appendChild(color)
	div.appendChild(removeBtn)

	charWrap.appendChild(div)
}

let updateUserChums = () => {

	userchum = {}

	var charWrap = document.getElementById("customChars")
	var characters = charWrap.querySelectorAll("div")

	characters.forEach(div => {
		userchum[div.querySelector("#chumName").value] = {
			"color": div.querySelector("#chumColor").value,
			"ao3": "",
			"handle": ""
		}
	})

	localStorage.setItem('userchum', JSON.stringify(userchum));

	userchum = JSON.parse(localStorage.getItem("userchum"))

	console.log(userchum)

	pesterchum = Object.assign({}, autochum, userchum)

}