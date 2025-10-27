// @ts-expect-error no declaration file
import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import {
  COMPUTER_IMAGE_MAX_WIDTH,
  PHOTO_IMAGE_MAX_HEIGHT,
  PHOTO_IMAGE_MAX_WIDTH,
  RECURSE_COMPUTER_BORDER,
} from "../constants";
import { SPECIAL_MESSAGES } from "~/data/calendar";
import { sendReceiptExternalPrinter } from "./print";

/**
 * Compose an array of images into a single image laid out vertically
 * @param images array of image data
 * @returns data of new composite image
 */
export function composeImages(images: string[]): Promise<string> {
  return new Promise(async (resolve) => {
    if (!Array.isArray(images) || images.length === 0) {
      resolve("");
      return;
    }

    // Load all images
    const imgs: HTMLImageElement[] = await Promise.all(
      images.map(
        (src) =>
          new Promise<HTMLImageElement>((res) => {
            const img = new Image();
            img.onload = () => res(img);
            img.onerror = () => res(img); // resolve anyway so a broken image doesn't block
            img.src = src;
          }),
      ),
    );

    // create new canvas to hold composite of images
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const padding = 32;
    canvas.width = imgs[0].width;
    canvas.height = imgs[0].height * imgs.length + padding * (imgs.length - 1);

    // draw each image
    const x = 0;
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      const y = i * (img.height + padding);
      ctx.drawImage(img, x, y, img.width, img.height);
    }

    resolve(canvas.toDataURL("image/png"));
  });
}

/**
 * Resize the image to a target width/height
 * @param data
 * @param targetWidth
 * @param targetHeight
 * @returns
 */
export function resizeImage(
  data: string,
  targetWidth: number,
  targetHeight: number,
): Promise<string> {
  return new Promise((resolve) => {
    const screenshotImg = new Image();
    screenshotImg.src = data;

    screenshotImg.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // sets up the canvas
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Becuase the screenshot from the webcam may be too arbitrarily wide or
      // long, we must not only select the appropriate part of the original
      // canvas to target, but also resize as well

      const idealHeight = (screenshotImg.width * targetHeight) / targetWidth;
      const idealWidth = screenshotImg.width;
      const idealX = 0;
      const idealY = Math.max((screenshotImg.height - idealHeight) / 2, 0);

      // this draws the photobooth photo
      ctx.drawImage(
        screenshotImg,
        idealX,
        idealY,
        idealWidth,
        idealHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );

      // get the canvas image as a data URL
      resolve(canvas.toDataURL("image/png"));
    };
  });
}

/**
 * Adds a Recurse frame to the photo screenshot and resizes it
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
      "convertImage screenshot: " +
        screenshotImg.width +
        " " +
        screenshotImg.height,
    );

    screenshotImg.onload = async () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const imageTargetWidth = targetWidth - RECURSE_COMPUTER_BORDER * 2;
      const scale = imageTargetWidth / screenshotImg.width;
      const imageWidth = imageTargetWidth;
      const imageHeight = screenshotImg.height * scale;
      console.log("convertImage image: " + imageWidth + " " + imageHeight);

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
        PHOTO_IMAGE_MAX_WIDTH,
        PHOTO_IMAGE_MAX_HEIGHT,
      );

      resolve(canvas.toDataURL("image/png"));
    };
  });
}

/**
 * Prints an image from canvas. Does the conversion to esc/pos format
 * for you.
 *
 * @param data
 * @param printerToken
 * @returns
 */
export async function simplePrint(
  data: string,
  printerToken: string | null | undefined,
): Promise<{ finalImage: string; statusCode: number | null }> {
  const photoImg = new Image();
  const blob = await fetch(data).then((r) => r.blob());
  const imgUrl = URL.createObjectURL(blob);

  await new Promise((resolve) => {
    photoImg.onload = resolve;
    photoImg.src = imgUrl;
  });

  // setting up the receipt
  const result: Uint8Array = new ReceiptPrinterEncoder({
    printerModel: "epson-tm-t88v",
    imageMode: "raster", // this is required for pretty images
  })
    .initialize()
    .align("center")
    .image(photoImg, photoImg.width, photoImg.height, "atkinson")
    .cut("full")
    .encode();

  const encodedBytes = Array.from(result)
    .map((byte: number) => byte.toString(16).padStart(2, "0"))
    .join("");
  console.log(encodedBytes);

  let statusCode = null;
  if (printerToken != null) {
    console.log("simplePrint: Sending to printer");
    statusCode = await sendReceiptExternalPrinter(result, printerToken);
  }

  return {
    finalImage: data,
    statusCode: statusCode,
  };
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
  printerToken: string | null | undefined,
): Promise<{ finalImage: string; statusCode: number | null }> {
  const photoImg = new Image();
  const blob = await fetch(data).then((r) => r.blob());
  const imgUrl = URL.createObjectURL(blob);

  await new Promise((resolve) => {
    console.log("renderPhotoAndPrint: Loading photoImg");
    photoImg.onload = resolve;
    photoImg.src = imgUrl;
  });

  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const customMessage = SPECIAL_MESSAGES[monthDay];

  // set up the custom message at the end of the receipt
  let tailMessage = "Never Graduate!";

  // setting up the title logo
  const recurseTitleImg = new Image();

  // loading the octopus image
  const ollie = new Image();
  if (customMessage) {
    ollie.src = customMessage.image;
    tailMessage = customMessage.message;
  } else {
    ollie.src = "/ollie.png";
  }

  await new Promise((res) => {
    ollie.onload = res;
    console.log("renderPhotoAndPrint: Loading ollie");
  });

  const title = await new Promise<string>((resolve) => {
    const rcCanvas = document.createElement("canvas");
    const ctx = rcCanvas.getContext("2d");
    if (!ctx) return;

    rcCanvas.width = COMPUTER_IMAGE_MAX_WIDTH;
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
    console.log("renderPhotoAndPrint: Loading recurseTitle");
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
    .line(tailMessage)
    .cut("full")
    .encode();

  let statusCode = null;

  if (printerToken != null) {
    console.log("renderPhotoAndPrint: Sending to printer");

    statusCode = await sendReceiptExternalPrinter(result, printerToken);
  }

  return {
    finalImage: data,
    statusCode: statusCode,
  };
}
