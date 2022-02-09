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
  // text contains the entry data as a String
  console.log(gdHtml);
  pruneHTML()
}

function getEntries(file, options) {
  return (new zip.ZipReader(new zip.BlobReader(file))).getEntries(options);
}



/////////////////
// ASSIGN TAGS //
/////////////////
let bbcode_format = {
  "bold": ["[b]", "[/b]"],
  "italic": ["[i]", "[/i]"],
  "underline": ["[u]", "[/u]"],
  "strikethrough": ["[s]", "[/s]"],

  "color": ["[color=%INPUT%]", "[/color]"],
  "font": ["[font=%INPUT%]", "[/font]"]
}
let markdown_format = {
  "bold": ["**", "**"],
  "italic": ["*", "*"],
  "underline": ["", ""],
  "strikethrough": ["~~", "~~"],

  "color": ["", ""],
  "font": ["", ""],
}
let html_format = {
  "bold": ["<b>", "</b>"],
  "italic": ["<i>", "</i>"],
  "underline": ["<u>", "</u>"],
  "strikethrough": ["<strike>", "</strike>"],

  "color": ["<span style='color:%INPUT%'>", "</span>"],
  "font": ["<span style='font-family:%INPUT%'>", "</span>"],
}

let formats = [bbcode_format, markdown_format, html_format]

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

    // Find tags in textDecoration
    var DecoTags = style.textDecoration.match(/(?:[^\s\(]+|\([^\)]*\))+/g)
    
    // Assign outside of decotags tags
    if (style.fontStyle == "italic") { pushBasicFormat("italic") }
    if (style.fontWeight == 700) { pushBasicFormat("bold") }
    if (style.fontFamily !== "\"Arial\"") { 
      var fontTagPair = [formats[i]["font"][0], formats[i]["font"][1]]
      fontTagPair[0] = fontTagPair[0].replace("%INPUT%", style.fontFamily)
      fTags.push(fontTagPair)
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
        var rgb = rule.substring(4, rule.length - 1).split(",")
        rgb.forEach((e, i) => { rgb[i] = parseInt(e.trim()) })
        if (rgb[0] + rgb[1] + rgb[2] !== 0) {
          var colourTagPair = [formats[i]["color"][0], formats[i]["color"][1]]
          var hexcolor =  rgb2hex(rgb[0], rgb[1], rgb[2])
          colourTagPair[0] = colourTagPair[0].replace("%INPUT%", hexcolor)
          fTags.push(colourTagPair)
        }
      }

    })

    tags.push(fTags)
  }
    
  return tags
}



////////////////
// PRUNE HTML //
////////////////
let pruneHTML = () => {
  fileOutput.innerHTML = gdHtml

  // Create Outputs for each format
  var output = []
  for (let i = 0; i < formats.length; i++) { output.push("") }

  // Contains tags for the style of each class of span
  var classStyles = {}

  var paragraphs = fileOutput.querySelectorAll("p")
  paragraphs.forEach(p => {
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

          spanText = tagPair[0] + spanText + tagPair[1]
        })
        spanText = startspace + spanText + endspace
        output[i] += spanText
      }

    })

    for (let i = 0; i < formats.length; i++) { output[i] += "\n" }
  })

  console.log(classStyles)
  console.log(output)
  output.forEach(e => {
    var div = document.createElement("div")
    div.innerText = e
    prunedOutput.appendChild(div)
  })
}