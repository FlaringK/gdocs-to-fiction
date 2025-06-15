var fileInput = document.getElementById("file-input")
var fileOutput = document.getElementById("file-output")
var prunedOutput = document.getElementById("pruned-output")
var ao3Output = document.getElementById("ao3-output")
var gdHtml


////////////////////////////
// GET HTML FILE FROM ZIP //
////////////////////////////
fileInput.onchange = async () => {
	var entries = await getEntries(fileInput.files[0], {});

	gdHtml = await entries[0].getData(
		new zip.TextWriter(),
	);
	// gdHtml contains the entry data as a String
	fileOutput.innerHTML = gdHtml.replaceAll("&amp;lt;", "&lt;")
}

function getEntries(file, options) {
	return (new zip.ZipReader(new zip.BlobReader(file))).getEntries(options);
}



////////////////////////////
// ASSIGN TAGS TO CLASSES //
////////////////////////////

// Get formats
var formats
var ao3Classes

var autochum = {}
var userchum = {}

var pesterchum

fetch("./formats.json").then(response => {
	return response.json();
}).then(jsondata => {
	formats = jsondata.formats
	ao3Classes = jsondata.ao3Classes
	autochum = jsondata.pesterchum
	userchum = JSON.parse(localStorage.getItem("userchum")) ? JSON.parse(localStorage.getItem("userchum")) : {}

	for (const [key, value] of Object.entries(autochum)) {
		if (jsondata.pchumNames[key]) {
			jsondata.pchumNames[key].forEach(dupKey => {
				autochum[dupKey.toUpperCase()] = value
			})
		}
	}


	for (const [key, value] of Object.entries(userchum)) {
		addChar(key, value.color)
	}

	pesterchum = Object.assign({}, autochum, userchum)

	generateFormats()
});

// Assign tags to class
let createTags = (style, spanClass) => {
	var tags = []
	// tags for each format
	for (let i = 0; i < formats.length; i++) {
		var fTags = []

		// FORMAT FUNCTIONS
		let pushBasicFormat = key => {
			fTags.push(formats[i][key])
		}

		let rgb2hex = (r, g, b) => {
			var rgb = (r << 16) | (g << 8) | b
			return '#' + rgb.toString(16).padStart(6, 0)
		}

		let getColor = (color, ruleName) => {
			var rgb = color.substring(4, color.length - 1).split(",")
			rgb.forEach((e, i) => {
				rgb[i] = parseInt(e.trim())
			})

            // If opacity == 0 skip
            if (rgb.length == 4) {
                if (rgb[3] == 0) {
                    return
                }
            }

            // add to tags
            var colourTagPair = [formats[i][ruleName][0], formats[i][ruleName][1]]
            var hexcolor = rgb2hex(rgb[0], rgb[1], rgb[2])
            colourTagPair[0] = colourTagPair[0].replace("%INPUT%", hexcolor)
            fTags.push(colourTagPair)
		}


		// =====
		// Find tags in textDecoration
		var DecoTags = style.textDecoration.match(/(?:[^\s\(]+|\([^\)]*\))+/g)

		// Assign outside of decotags tags (Order matters)

		// Bold Italic
		if (style.fontStyle == "italic") {
			pushBasicFormat("italic")
		}
		if (style.fontWeight == 700) {
			pushBasicFormat("bold")
		}

		// Background
		if (document.getElementById("bgcolor").checked) {
            if (style["background-color"] != "rgb(255, 255, 255)") {
                getColor(style["background-color"], "background")
            }
		}

		// Fonts
		var fontTagPair = [formats[i]["font"][0], formats[i]["font"][1]]
		fontTagPair[0] = fontTagPair[0].replace("%INPUT%", style.fontFamily)
		fTags.push(fontTagPair)

		// Underline/strike/color
		DecoTags.forEach(rule => {
			switch (rule) {
				case "underline":
					pushBasicFormat("underline")
					break
				case "line-through":
					pushBasicFormat("strikethrough")
					break
			}

			if (rule.includes("rgb")) {
                if (!rule.includes("0, 0, 0")) {
				    getColor(rule, "color")
                }
			}

		})

		// Size
		var sizeTagPair = [formats[i]["size"][0], formats[i]["size"][1]]
		var roundedFontSize = parseFloat(style.fontSize.substring(0, style.fontSize.length - 2)).toFixed(0)
		sizeTagPair[0] = sizeTagPair[0].replace("%INPUT%", roundedFontSize)
		fTags.push(sizeTagPair)

		tags.push(fTags)
	}

	return tags
}

//////////////////////
// GENERATE FORMATS //
//////////////////////

let generateFormats = () => {
	prunedOutput.innerHTML = ""
	ao3Output.innerHTML = ""

	// Create Outputs for each format
	var output = []
	for (let i = 0; i < formats.length; i++) {
		output.push("")
	}

	// Contains tags for the style of each class of span
	var classStyles = {}

	// replace divs
	fileOutput.innerHTML = fileOutput.innerHTML.replaceAll("<div", "<p").replaceAll("div>", "p>")

	var paragraphs = fileOutput.querySelectorAll("p, h1, h2, h3, h4, h5, h6")
	paragraphs.forEach((p, paraIndex) => {

		// Check if there's any text in the paragraph at all
		if (p.innerText) {

			// Add opening paragraph tag
			var headingNumber = p.nodeName == "P" ? 0 : parseInt(p.nodeName.substring(1))
			for (let i = 0; i < formats.length; i++) {
				output[i] += formats[i].headings[headingNumber][0]
			}

			var spans = p.querySelectorAll("span, br")
			spans.forEach((span, spanIndex) => {
				
				// Check if it's br
				if (span.nodeName == "BR") {
					for (let i = 0; i < formats.length; i++) {
						if (!output[i].trim().endsWith(formats[i].headings[headingNumber][0])) {
							output[i] += formats[i].headings[headingNumber][1] + "\n" + formats[i].headings[headingNumber][0]
						}
					}
					return
				}

				// Create classStyle if class isn't in object yet
                let className = span.classList.toString() + "_" + paraIndex
				if (!(className in classStyles) && className) {
					classStyles[className] = createTags(getComputedStyle(span), span.classList)
				}

				// Format span one for each format style
				var spanTags = classStyles[className]
				for (let i = 0; i < formats.length; i++) {
					var spanText = span.innerText
					var startspace = ""
					var endspace = ""

                    // If span text is just an empty space at the end of the line, skip it:
                    if (/^\s+$/.test(spanText) && spanIndex == spans.length - 1) {
                        continue
                    }

					// Check if link exists in span
					if (span.querySelector("a")) {
						var link = span.querySelector("a")
						var replaceLink = formats[i]["url"][0] + link.innerText + formats[i]["url"][1]
						var url = link.href.substring(29, link.href.indexOf("&", 29)).replaceAll("%3D", "=")
						replaceLink = replaceLink.replace("%INPUT%", url)
						spanText = spanText.replace(link.innerText, replaceLink)
					}

					// Apply tags
					spanTags[i].forEach(tagPair => {
						// Surround text in tags
						spanText = tagPair[0] + spanText + tagPair[1]
					})
					spanText = startspace + spanText + endspace
					output[i] += spanText
				}

			})

			// Add closing paragraph tag
			for (let i = 0; i < formats.length; i++) {
				output[i] += formats[i].headings[headingNumber][1] + "\n"
			}

		} else { // if there's no text in the paragraph
			for (let i = 0; i < formats.length; i++) {
				output[i] += formats[i].headings[0][0] + "\n" + formats[i].headings[0][1]
			}
		}
	})

    console.log(classStyles)

	// Output to page
	console.log(classStyles)
	output.forEach((e, i) => {
		// Create outputs
		createOutputTextArea(formats[i].name, e.trim(), prunedOutput)

		// Generate AO3 from basic html
		if (formats[i].name == "Basic_HTML") generateAo3FormatAndWorkskin(e.trim())
	})
}

let createOutputTextArea = (name, textContent, location) => {
	var wrap = document.createElement("div")
	wrap.innerText = name
	wrap.id = name

	var textarea = document.createElement("textarea")
	textarea.innerHTML = textContent
	wrap.appendChild(textarea)

	location.appendChild(wrap)
}

let generateAo3FormatAndWorkskin = basicHtml => {

	let workskinContent = ".spacer { display: block; height: 1em; }\np { margin: 0; }\n"
	let textContent = basicHtml
	let styleTagRegex = /style='([a-z-]+):([^']+)'/g
	let invalidCSSCharacterRegex = /[^a-zA-Z0-9-_]/g

	if (document.getElementById("ao3line").checked) {
		workskinContent += "p { line-height: 1.15; }\n"
	}

	let createdClasses = []

	textContent = textContent.replace(styleTagRegex, (match, p1, p2) => {
		let className = `${p1}_${p2.replace(invalidCSSCharacterRegex, "")}`
		let htmlClass = `class='${className}'`
		let cssSelector = `.${className} { ${p1}: ${p2}; }\n`

		// Add class to workskin
		if (!createdClasses.includes(cssSelector)) {
			createdClasses.push(cssSelector)
		}
		return htmlClass
	})

	textContent = textContent.replaceAll(/\s</g, "<")
	textContent = textContent.replaceAll(/>\s/g, ">")
	textContent = textContent.replaceAll("<p></p>", "<div class='spacer'></div>")

	createdClasses.sort()
	createdClasses.forEach(selector => {
		workskinContent += selector
	})

	createOutputTextArea("AO3 HTML", textContent, ao3Output)
	createOutputTextArea("AO3 Workskin", workskinContent, ao3Output)

}