const fileInput = document.querySelector("#qr-file");
const canvas = document.querySelector("#reader-canvas");
const status = document.querySelector("#reader-status");
const upload = document.querySelector("#drop-zone");
const result = document.querySelector("#decoded-result");
const detailsGrid = document.querySelector("#details-grid");
const readAnother = document.querySelector("#read-another");

const fields = [
  ["reference", "Verification reference"],
  ["vehicle", "Vehicle model"],
  ["deliveryDate", "Delivery date"],
  ["batteryBrand", "Battery brand"],
  ["batterySerial", "Battery serial number"],
  ["batteryPower", "Battery power"],
  ["batterySpec", "Battery specification"],
  ["batteryRegistrationDate", "Battery registration date"],
  ["ownerName", "Owner name"],
  ["ownerId", "Owner ID"],
  ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"],
  ["email", "Email address"],
];

function showError(message) {
  status.textContent = message;
  status.className = "reader-status error";
}

async function decodePayload(rawData) {
  if (!rawData.startsWith("EV1:")) return JSON.parse(rawData);
  if (!("DecompressionStream" in window)) throw new Error("Compressed QR reading is not supported in this browser.");
  const binary = atob(rawData.slice(7));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const json = await new Response(stream).text();
  return JSON.parse(json);
}

function decodeImage(file) {
  const image = new Image();
  image.onload = async () => {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const sourceSize = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = sourceSize < 700 ? 700 / sourceSize : 1;
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = typeof jsQR === "function"
      ? jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" })
      : null;
    if (!code) {
      showError("We couldn’t find a QR code in that image. Please try the saved verification PNG.");
      return;
    }
    try {
      const payload = await decodePayload(code.data);
      if (!payload.registration) throw new Error("Invalid registration");
      renderResult(payload.registration);
    } catch {
      showError("This QR code is not an EV registration pass.");
    }
  };
  image.onerror = () => showError("That image could not be opened.");
  image.src = URL.createObjectURL(file);
}

function renderResult(registration) {
  document.querySelector("#decoded-title").textContent = `${registration.vehicle} · ${registration.reference}`;
  detailsGrid.replaceChildren();
  fields.forEach(([key, label]) => {
    if (!registration[key]) return;
    const wrapper = document.createElement("div");
    wrapper.className = "decoded-field";
    wrapper.innerHTML = `<span>${label}</span><strong></strong>`;
    wrapper.querySelector("strong").textContent = registration[key];
    detailsGrid.append(wrapper);
  });
  upload.hidden = true;
  result.hidden = false;
}

fileInput.addEventListener("change", () => {
  const [file] = fileInput.files;
  if (!file) return;
  status.textContent = "Reading QR code…";
  status.className = "reader-status";
  decodeImage(file);
});

readAnother.addEventListener("click", () => {
  result.hidden = true;
  upload.hidden = false;
  fileInput.value = "";
  status.textContent = "";
});
