// @ts-expect-error no declaration file
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import {
  COMPUTER_IMAGE_MAX_WIDTH,
  PHOTO_IMAGE_MAX_HEIGHT,
  PHOTO_IMAGE_MAX_WIDTH,
  RECURSE_COMPUTER_BORDER,
  NEW_PRINTER_ENDPOINT,
} from "../constants";

/**
 * Resizes the photo screenshot to appropriately render a Recurse computer
 * image to something appropriate for the Recurse and resizes it
 *
 * @param data - screenshot from the webcam
 * @param targetWidth - target width of the final image
 * @returns
 */
export function convertImage(
  data: string,
  targetWidth: number,
): Promise<string> {
  return new Promise((resolve) => {
    const screenshotImg = new Image();
    screenshotImg.src = data;
    console.log(
      "Screenshot: " + screenshotImg.width + " " + screenshotImg.height,
    );

    screenshotImg.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageTargetWidth = targetWidth - RECURSE_COMPUTER_BORDER * 2;
      const scale = imageTargetWidth / screenshotImg.width;
      const imageWidth = imageTargetWidth;
      const imageHeight = screenshotImg.height * scale;
      console.log("image area: " + imageWidth + " " + imageHeight);

      const recurseComputerImg = new Image();
      recurseComputerImg.src = "/recurse.png";
      await new Promise((res) => {
        recurseComputerImg.onload = res;
      });
      const recurseScale = targetWidth / recurseComputerImg.width;
      const recurseWidth = targetWidth;
      const recurseHeight = recurseComputerImg.height * recurseScale;

      // sets up the canvas
      canvas.width = recurseWidth;
      canvas.height = Math.floor(recurseHeight / 8) * 8;

      // casts the recurse computer into canvas and resizes
      ctx.drawImage(
        recurseComputerImg,
        0,
        0,
        recurseComputerImg.width,
        recurseComputerImg.height,
        0,
        0,
        recurseWidth,
        Math.floor(recurseHeight / 8) * 8,
      );

      // set up the date
      ctx.filter = "grayscale(100%)";
      ctx.fillStyle = "white";
      ctx.fillRect(80, 490, COMPUTER_IMAGE_MAX_WIDTH - 160, 90);
      ctx.fillStyle = "black";
      ctx.font = "bold 48px Courier";
      ctx.textAlign = "center";
      const today = new Date();
      const textX = canvas.width / 2;
      const textY = 490 + 60;
      ctx.fillText(today.toISOString().split("T")[0], textX, textY);

      // Becuase the screenshot from the webcam may be too arbitrarily wide or
      // long, we must not only select the appropriate part of the original
      // canvas to target, but also resize as well

      // TODO: do the resize when the camera is wider than taller and vice versa
      const idealHeight =
        (screenshotImg.width * PHOTO_IMAGE_MAX_HEIGHT) / PHOTO_IMAGE_MAX_WIDTH;
      const idealWidth = screenshotImg.width;
      const idealX = 0;
      const idealY = (screenshotImg.height - idealHeight) / 2;

      // this draws the photobooth photo
      ctx.drawImage(
        screenshotImg,
        idealX,
        idealY,
        idealWidth,
        idealHeight,
        RECURSE_COMPUTER_BORDER,
        RECURSE_COMPUTER_BORDER + 10,
        456,
        PHOTO_IMAGE_MAX_HEIGHT,
      );

      // return the canvas
      resolve(canvas.toDataURL("image/png"));
    };
  });
}

/**
 * Renders the photobooth item and sends it to the printer.
 *
 * @param datascreenshot of the item
 * @param optionalText optional text for the photobooth
 */
export async function renderPhotoAndPrint(
  data: string,
  optionalText: string | null = null,
  printerToken: string | null,
) {
  const photoImg = new Image();
  const blob = await fetch(data).then((r) => r.blob());
  const imgUrl = URL.createObjectURL(blob);

  await new Promise((resolve) => {
    photoImg.onload = resolve;
    photoImg.src = imgUrl;
  });

  console.log("Screenshot: " + photoImg.width + " " + photoImg.height);

  // setting up the title logo
  const recurseTitleImg = new Image();

  // loading the octopus image
  const ollie = new Image();
  ollie.src = "/ollie.png";
  await new Promise((res) => {
    ollie.onload = res;
  });

  const title = await new Promise<string>((resolve) => {
    const rcCanvas = document.createElement("canvas");
    const ctx = rcCanvas.getContext("2d");
    if (!ctx) return;

    rcCanvas.width = 496;
    rcCanvas.height = 72;

    ctx.fillStyle = "black";
    ctx.font = "bold 48px Courier";
    ctx.fillText("RECURSE CENTER", 85, 60);
    ctx.drawImage(ollie, 0, 0, 72, 72);
    resolve(rcCanvas.toDataURL("image/png"));
  });

  await new Promise((resolve) => {
    recurseTitleImg.onload = resolve;
    recurseTitleImg.src = title;
  });

  // setting up the receipt
  let encoder = new ReceiptPrinterEncoder({
    printerModel: "epson-tm-t88v",
    imageMode: "raster", // this is required for pretty images
  });

  encoder
    .initialize()
    .align("left")
    .image(recurseTitleImg, 496, 72, "atkinson")
    .image(photoImg, photoImg.width, photoImg.height, "atkinson")
    .align("center");

  // add the optional text coming from photobooth
  if (optionalText) {
    encoder = encoder.line(optionalText);
  }

  const result = encoder
    .line("------------------------------------------")
    .line("Thank you have a nice day!")
    .line("www.recurse.com")
    .line("")
    .line("")
    .cut("full")
    .encode();
  //
  // sends the receipt to print
  // await sendReceipt("/receipt/escpos", result);

  if (printerToken != null) {
    await sendReceiptExternalPrinter(result, printerToken);
  }
}

// /**
//  * Sends a request to the receipt printer.
//  *
//  * @param url receipt printer URL
//  * @param photoData processed data to send
//  */
// async function sendReceipt(url: string, photoData: Uint8Array) {
//   // encode the bytearray to a base64 version
//   const b64_version = btoa(String.fromCharCode(...photoData));
//   console.log(b64_version);

//   const response = await fetch(url, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       "Access-Control-Allow-Origin": "*",
//     },
//     body: JSON.stringify({ buffer: photoData }),
//   });
//   const resp = await response.json();
//   console.log("JSON response : " + resp);
// }

/**
 * Sends a request to the receipt printer on the external network.
 *
 * @param url receipt printer URL
 * @param photoData processed data to send
 */
async function sendReceiptExternalPrinter(
  photoData: Uint8Array,
  photoToken: string,
) {
  const response = await fetch(NEW_PRINTER_ENDPOINT, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-CSRF-Token": photoToken,
    },
    body: photoData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error, status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const resp = await response.json();
    console.log("JSON response: ", resp);
  } else {
    const text = await response.text();
    console.log("Non-JSON response: ", text);
  }
}
