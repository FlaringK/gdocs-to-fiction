var fileInput = document.getElementById("file-input")

fileInput.onchange = async () => {
  var entry = await model.getEntries(fileInput.files[0], { });
  if (entry) {
    console.log(entry)

    const blobURL = await model.getURL(entry, {
      password: "",
      onprogress: (index, max) => {  }
    });
  }
}

function handleFileLoad(event) {
  console.log(event);
  document.getElementById('fileContent').textContent = event.target.result;
}

// Stolen from demo
const model = (() => {

  return {
    getEntries(file, options) {
      return (new zip.ZipReader(new zip.BlobReader(file))).getEntries(options);
    },
    async getURL(entry, options) {
      return URL.createObjectURL(await entry.getData(new zip.BlobWriter(), options));
    }
  };

})();