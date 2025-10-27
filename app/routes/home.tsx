import React, { useRef, useState, useCallback, useEffect } from "react";
import type { Route } from "./+types/home";
import Webcam from "react-webcam";
import {
  composeImages,
  convertImage,
  renderPhotoAndPrint,
  resizeImage,
  simplePrint,
  sendReceipt,
} from "~/processing/image";
import { COMPUTER_IMAGE_MAX_WIDTH, RECEIPT_AUTH_LOGIN } from "~/constants";
import classNames from "classnames";

// video and style constraints
const videoConstraints = {
  facingMode: "user",
};
const styleConstraints: React.CSSProperties = {
  filter: "grayscale(100%)",
  objectFit: "cover",
  width: "clamp(320px, 80vw, 640px)",
};

type PhotoMode = "selfie" | "photobooth";

// eslint-disable-next-line no-empty-pattern
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Recurse Photobooth" },
    { name: "description", content: "Recurse Photobooth" },
    { tagName: "link", rel: "icon", href: "/favicon.ico" },
  ];
}

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

/**
 * Renders the photo preview section and any related errors to the
 * API call.
 */
function getPhotoResult(
  imagePreview: string, // this needs to be used later
  statusCode: number,
): React.ReactElement {
  let message = <></>;
  if (statusCode == 200) {
    message = (
      <>Photo was successfully printed to the Recurse receipt printer!</>
    );
  } else {
    message = (
      <>
        Photo failed to successfully print (API response code: {statusCode}).
        Make sure you have a valid login at{" "}
        <a
          href={RECEIPT_AUTH_LOGIN}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {RECEIPT_AUTH_LOGIN}
        </a>{" "}
        and refresh.
      </>
    );
  }

  return (
    <div className="w-full max-w-[640px] min-w-[340px] mx-auto items-center justify-center text-black bg-white dark:bg-gray-900 dark:text-white mt-4">
      {message}
    </div>
  );
}

/**
 * The beautiful webcam display.
 *
 * TODO: refactor
 * @returns
 */
export function WebcamDisplay() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    printerToken: null as string | null | undefined,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [imgSrc, setImgSrc] = useState<string | null>(null); // we will use imgSrc eventually
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inputText, setInputText] = useState<string | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);

  const [photoMode, setPhotoMode] = useState<PhotoMode>("selfie");
  const [currentPhoto, setCurrentPhoto] = useState<number | null>(null);
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      document.cookie = "receipt_csrf=dev_token; path=/";
    }

    const printerToken = getCookie("receipt_csrf");
    setAuthState({
      isAuthenticated: !!printerToken,
      printerToken,
    });
  }, []);

  const takeScreenshot = async () => {
    setCountdown(3);

    for (let i = 2; i >= 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCountdown(i);
    }

    const screenshot = webcamRef.current?.getScreenshot() ?? null;
    setCountdown(null);
    return screenshot;
  };

  const capture = useCallback(async () => {
    setStatusCode(null);
    setCountdown(3);

    for (let i = 2; i >= 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCountdown(i);
    }

    const screenshot = webcamRef.current?.getScreenshot() ?? null;
    if (screenshot) {
      const resized = await convertImage(screenshot, COMPUTER_IMAGE_MAX_WIDTH);
      const results = await renderPhotoAndPrint(
        resized,
        inputText,
        authState.printerToken,
      );
      setImgSrc(results.finalImage);
      setStatusCode(results.statusCode);
    }

    // clear on end
    setCountdown(null);
    setInputText(null);
  }, [inputText, authState.printerToken]);

  const multiCapture = async () => {
    setCurrentPhoto(1);
    const imgs: string[] = [];
    for (let i = 0; i < 4; i++) {
      const screenshot = await takeScreenshot();
      if (screenshot) {
        const img = await resizeImage(screenshot, 512, 384);
        imgs.push(img);
      }
      setCurrentPhoto((curr) => (curr ?? 0) + 1);
    }
    setCurrentPhoto(null);
    const composed = await composeImages(imgs);

    if (composed) {
      const results = await simplePrint(composed, authState.printerToken);
      setImgSrc(results.finalImage);
      setStatusCode(results.statusCode);
    }
  };

  if (!authState.isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white  dark:bg-gray-900 dark:text-white">
        <p>Please authenticate with the Recurse Center for access: </p>
        <p>
          <a
            href="https://receipt.recurse.com/login"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Login to Recurse
          </a>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 flex gap-2 text-black dark:text-white">
        <button
          className={classNames(
            "border border-black dark:border-gray-200 rounded-lg p-2 hover:cursor-pointer",
            { "bg-blue-200 text-black": photoMode === "selfie" },
          )}
          onClick={() => setPhotoMode("selfie")}
        >
          selfie
        </button>
        <button
          className={classNames(
            "border border-black dark:border-gray-200 rounded-lg p-2 hover:cursor-pointer",
            { "bg-blue-200 text-black": photoMode === "photobooth" },
          )}
          onClick={() => setPhotoMode("photobooth")}
        >
          photobooth
        </button>
      </div>
      <div className="flex items-center justify-center h-[calc(100vh-3rem)] text-black bg-white dark:bg-gray-900 dark:text-white">
        <div className="flex flex-col min-[800px]:flex-row items-center justify-center text-center">
          <div className="relative w-full max-w-md flex flex-col items-center">
            {photoMode === "photobooth" && currentPhoto != null && (
              <div>taking photo {currentPhoto}/4</div>
            )}
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={videoConstraints}
              style={styleConstraints}
              screenshotFormat="image/png"
              className="-scale-x-100 rounded-lg shadow-2xl "
            />

            <div>
              <textarea
                value={inputText || ""}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Optional Text"
                className="border bg-white text-black placeholder-gray-400 p-4 mt-4"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={photoMode === "selfie" ? capture : multiCapture}
            disabled={countdown != null}
            className="mt-2 min-[800px]:ml-8  bg-red-600 border-2 border-white rounded-full px-6 py-3 text-xl font-bold text-white hover:bg-red-500 active:scale-95 transition-transform"
          >
            {countdown !== null
              ? `Ready in ${countdown}...`
              : "Take a picture!"}
          </button>
        </div>
      </div>

      {statusCode != null && (
        <div className="mt-4 px-4">{getPhotoResult(imgSrc, statusCode)}</div>
      )}

      <div className="pl-4 mt-8 py-8 text-black bg-white dark:bg-gray-900 dark:text-white">
        <p>A Recurse project.</p>

        <a
          className="text-blue-600 underline hover:text-blue-800"
          href="https://github.com/minsun-ss/app-recurse-selfie"
        >
          Contribute here!
        </a>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <div className="bg-white text-black dark:bg-gray-900 dark:text-white">
      <WebcamDisplay />
    </div>
  );
}
