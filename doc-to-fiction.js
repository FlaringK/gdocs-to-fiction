var fileInput = document.getElementById("file-input")
var fileOutput = document.getElementById("file-output")
var prunedOutput = document.getElementById("pruned-output")
var gdHtml


////////////////////////////
// GET HTML FILE FROM ZIP //
////////////////////////////
fileInput.onchange = async () => {
  var entries = await getEntries(fileInput.files[0], { });

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
fetch("./formats.json").then(response => { return response.json(); }).then(jsondata => {
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

    let pushBasicFormat = key => { fTags.push(formats[i][key]) }
    let rgb2hex = (r, g, b) => {
      var rgb = (r << 16) | (g << 8) | b
      return '#' + rgb.toString(16).padStart(6, 0)  
    }
    let getColor = rule => {
      var rgb = rule.substring(4, rule.length - 1).split(",")
        rgb.forEach((e, i) => { rgb[i] = parseInt(e.trim()) })
        if (rgb[0] + rgb[1] + rgb[2] !== 0) {
          var colourTagPair = [formats[i]["color"][0], formats[i]["color"][1]]
          var hexcolor =  rgb2hex(rgb[0], rgb[1], rgb[2])
          colourTagPair[0] = colourTagPair[0].replace("%INPUT%", hexcolor)
          fTags.push(colourTagPair)
        }
    }

    // Find tags in textDecoration
    var DecoTags = style.textDecoration.match(/(?:[^\s\(]+|\([^\)]*\))+/g)
    
    // Assign outside of decotags tags
    if (style.fontStyle == "italic") { pushBasicFormat("italic") }
    if (style.fontWeight == 700) { pushBasicFormat("bold") }
    if (!style.fontFamily.includes("Arial")) { 
      var fontTagPair = [formats[i]["font"][0], formats[i]["font"][1]]
      fontTagPair[0] = fontTagPair[0].replace("%INPUT%", style.fontFamily)
      fTags.push(fontTagPair)
    }
    if (style.fontSize !== "14.6667px") {
      var sizeTagPair = [formats[i]["size"][0], formats[i]["size"][1]]
      var roundedFontSize = parseFloat(style.fontSize.substring(0, style.fontSize.length - 2)).toFixed(0) + "px"
      sizeTagPair[0] = sizeTagPair[0].replace("%INPUT%", roundedFontSize)
      fTags.push(sizeTagPair)
    }

    DecoTags.forEach(rule => {
      switch (rule) {
        case "underline":
          pushBasicFormat("underline")
          break
        case "line-through":
          pushBasicFormat("strikethrough")
          break
      }
      
      //RGB
      if (rule.includes("rgb")) {
        getColor(rule)
      }

    })

    tags.push(fTags)
  }
    
  return tags
}



//////////////////////
// GENERATE FORMATS //
//////////////////////

let generateFormats = () => {
  prunedOutput.innerHTML = ""

  // Create Outputs for each format
  var output = []
  for (let i = 0; i < formats.length; i++) { output.push("") }

  // Contains tags for the style of each class of span
  var classStyles = {}
  
  // replace divs
  fileOutput.innerHTML = fileOutput.innerHTML.replaceAll("<div", "<p").replaceAll("div>", "p>")

  var paragraphs = fileOutput.querySelectorAll("p, h1, h2, h3, h4, h5, h6")
  paragraphs.forEach(p => {

    // Check if there's any text in the paragraph at all
    if (p.innerText) {

      // Add opening paragraph tag
      var headingNumber = p.nodeName == "P" ? 0 : parseInt(p.nodeName.substring(1))
      for (let i = 0; i < formats.length; i++) { 
        output[i] += formats[i].headings[headingNumber][0]
      }

      var spans = p.querySelectorAll("span")
      spans.forEach(span => {

        // Create classStyle if class isn't in object yet
        if (!(span.classList in classStyles) && span.classList) {
          classStyles[span.classList.toString()] = createTags(getComputedStyle(span), span.classList)
        }

        // Format span one for each format style
        var spanTags = classStyles[span.classList.toString()]
        for (let i = 0; i < formats.length; i++) {
          var spanText = span.innerText
          var startspace = ""
          var endspace = ""

          // Check if link exists in span
          if (span.querySelector("a")) {
            var link = span.querySelector("a")
            var replaceLink = formats[i]["url"][0] + link.innerText + formats[i]["url"][1]
            var url = link.href.substring(29, link.href.indexOf("&", 29))
            replaceLink = replaceLink.replace("%INPUT%", url)
            spanText = spanText.replace(link.innerText, replaceLink)
          }

          // Apply tags
          spanTags[i].forEach(tagPair => {
            //Correct for spaces between tags
            if (spanText[0] == " ") { 
              startspace = " "
              spanText = spanText.substring(1)
            }
            if (spanText[spanText.length - 1] == " ") { 
              endspace = " "
              spanText = spanText.substring(0, spanText.length - 1)
            }
            // Surround text in tags
            spanText = tagPair[0] + spanText + tagPair[1]
          })
          spanText = startspace + spanText + endspace
          output[i] += spanText
        }

      })

      console.log(classStyles)

      // Add closing paragraph tag
      for (let i = 0; i < formats.length; i++) { 
        output[i] += formats[i].headings[headingNumber][1] + "\n"
      }

    } else { // if there's no text in the paragraph
      for (let i = 0; i < formats.length; i++) { 
        output[i] += "\n"
      }
    }
  })

  // Output to page
  console.log(classStyles)
  output.forEach((e, i) => {

    // Replace Pchums
    e = e.replaceAll(formats[i].headings[0][0] + PstartString + formats[i].headings[0][1], formats[i].pchum[0])
    e = e.replaceAll(formats[i].headings[0][0] + PendString + formats[i].headings[0][1], formats[i].pchum[1])

    // html
    e = e.replaceAll("<p><span style='color:#000000'>pchumStart_flaringKisCool</span></p>", formats[i].pchum[0])
    e = e.replaceAll("<p><span style='color:#000000'>pchumEnd_flaringKisCool</span></p>", formats[i].pchum[1])

    // remove <p> in block
    e = e.replace(/<div class='block pchum'>((.|\n)+?)<\/div>/g, (match, p1) => {
      match = match.replace(/<p>/g, "").replace(/<\/p>/g, "<br>")
      return match
    })

    // bbcode
    e = e.replace(/^.+\[spoiler\].+/gm, formats[i].pchum[0])
    e = e.replace(/^.+\[\/spoiler\].+/gm, formats[i].pchum[1])

    // Create outputs
    var wrap = document.createElement("div")
    wrap.innerText = formats[i].name
    wrap.id = formats[i].name

    var content = document.createElement("textarea")
    content.innerHTML = e
    wrap.appendChild(content)

    prunedOutput.appendChild(wrap)
  })

  // Format AO3
  var ao3 = document.getElementById("Basic_HTML").cloneNode(true)
  ao3.innerHTML = ao3.innerHTML.replace("Basic_HTML", "AO3 HTML")
  console.log(ao3.innerHTML)

  // Remove fonts
  ao3.innerHTML = ao3.innerHTML.replace(/&lt;span style='font-family:.+?'&gt;(.+?)&lt;\/span&gt;/g, "$1")
  // Remove spaces
  ao3.innerHTML = ao3.innerHTML.replace(/\n\n/g, "\n")

  ao3.id = "ao3_Html"
  
  for (const [key, value] of Object.entries(ao3Classes)) {
    ao3.innerHTML = ao3.innerHTML.replaceAll("style='color:" + value + "'", "class=\"" + key + "\"")
  }

  prunedOutput.appendChild(ao3)
}

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
    (p.innerText.substring(p.innerText.length - 2, p.innerText.length) == "--" || p.innerText[p.innerText.length - 1] == "–")
    && p.innerText.includes(" ")
  }

  //Remvoe paragraphs
  if (arrowremove) {
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].innerText.substring(0, 2) == "> " || paragraphs[i].innerText.substring(0, 2) == "*> ") {
        paragraphs[i].innerHTML = paragraphs[i].innerHTML.replace("&gt; ", "").replace("*&gt; ", "")
        if (!paragraphs[i].innerText.includes(":")) { paragraphs[i].innerHTML = "<span>-- </span>" + paragraphs[i].innerHTML + "<span> --</span>"}
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
  name.oninput = () => {name.value = name.value.toUpperCase()}
  name.id = "chumName"
  if (inputName) {name.value = inputName}

  var color = document.createElement("input")
  color.type = "color"
  color.id = "chumColor"
  if (inputColor) {color.value = inputColor}

  var removeBtn = document.createElement("button")
  removeBtn.innerText = "X"
  removeBtn.onclick = () => {removeBtn.parentNode.remove()}

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