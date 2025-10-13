import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import fs from "fs";

/**
 * Resizes the image to something appropriate for the Recurse
 * receipt printer (512 px wide). Although it's 512 max, everything is set to 496
 * for decent centering
 *
 * @param data
 * @param targetWidth
 * @returns
 */
export function convertImage(
  data: string,
  targetWidth: number,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      console.log(img.width + " " + img.height);

      const computerBorder = 20;
      const imageTargetWidth = targetWidth - computerBorder * 2;
      const scale = imageTargetWidth / img.width;
      const imageWidth = imageTargetWidth;
      const imageHeight = img.height * scale;
      console.log("image area: " + imageWidth + " " + imageHeight);

      const recurse_bg = new Image();
      recurse_bg.src = "/recurse.png";
      await new Promise((res) => {
        recurse_bg.onload = res;
      });
      const recurse_scale = targetWidth / recurse_bg.width;
      const recurse_width = targetWidth;
      const recurse_height = recurse_bg.height * recurse_scale;
      console.log("recurse bg " + recurse_bg.width + " " + recurse_bg.height);

      // setting up the final canvas
      canvas.width = recurse_width;
      canvas.height = Math.floor(recurse_height / 8) * 8;

      // draws the computer
      ctx.drawImage(
        recurse_bg,
        0,
        0,
        recurse_bg.width,
        recurse_bg.height,
        0,
        0,
        recurse_width,
        Math.floor(recurse_height / 8) * 8,
      );

      ctx.filter = "grayscale(100%)";
      ctx.fillStyle = "white";
      ctx.fillRect(80, 490, 496 - 160, 90);

      // set up the date
      ctx.fillStyle = "black";
      ctx.font = "bold 48px Courier";
      ctx.textAlign = "center";
      const today = new Date();
      const textX = canvas.width / 2;
      const textY = 490 + 60;
      ctx.fillText(today.toISOString().split("T")[0], textX, textY);

      // don't ask me how this works i don't remember
      const idealHeight = (img.width * 342) / 456;
      const idealX = 0;
      const idealY = (img.height - idealHeight) / 2;
      const idealWidth = img.width;

      // this draws the photobooth photo
      ctx.drawImage(
        img,
        idealX,
        idealY,
        idealWidth,
        idealHeight,
        computerBorder,
        computerBorder + 10,
        456,
        342,
      );

      resolve(canvas.toDataURL("image/png"));
    };
    img.src = data;
  });
}

export async function encodeImage(data: string, optionalText: string = null) {
  const response = await fetch(data);
  const blob = await response.blob();

  const img = new Image();
  const imgUrl = URL.createObjectURL(blob);
  await new Promise((resolve) => {
    img.onload = resolve;
    img.src = imgUrl;
  });

  console.log(img.width + " " + img.height);
  let encoder = new ReceiptPrinterEncoder({
    printerModel: "epson-tm-t88v",
  });

  const recurseTitleImg = new Image();
  const ollie = new Image();
  ollie.src = "/ollie.png";
  await new Promise((res) => {
    ollie.onload = res;
  });

  const title = await new Promise((resolve) => {
    const rcCanvas = document.createElement("canvas");
    const ctx = rcCanvas.getContext("2d");
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

  encoder
    .initialize()
    .align("left")
    .image(recurseTitleImg, 496, 72, "atkinson")
    .image(img, img.width, img.height, "atkinson")
    .align("center");

  if (optionalText) {
    encoder = encoder.line(optionalText);
  }
  console.log("Optional Text " + optionalText);

  let result = encoder
    .line("------------------------------------------")
    .line("Thank you have a nice day!")
    .line("www.recurse.com")
    .line("")
    .line("")
    .cut("full")
    .encode();
  const b64_version = btoa(String.fromCharCode(...result));
  console.log(b64_version);
  console.log(result);

  const endpoint = "/receipt/escpos";
  await sendReceipt(endpoint, b64_version);
}

async function sendReceipt(url: string, photoData: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ buffer: photoData }),
  });
  const resp = await response.json();
  console.log(resp);
}

// // turns out you can't use filewriter on client side code
// const fileBlob = new Blob([result], { type: "text/plain" });
// const url = URL.createObjectURL(fileBlob);
// const a = document.createElement("a");
// a.href = url;
// a.download = "output.bin";
// a.click();
