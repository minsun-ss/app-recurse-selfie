import React, { useRef, useState, useCallback, useEffect } from "react";
import type { Route } from "./+types/home";
import Webcam from "react-webcam";
import { convertImage, renderPhotoAndPrint } from "~/processing/image";
import { COMPUTER_IMAGE_MAX_WIDTH } from "~/constants";

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
 *
 * @returns
 */
export function WebcamDisplay() {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    printerToken: null as string | null | undefined,
  });

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [inputText, setInputText] = useState<string | null>(null);

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

  // set up video and style constraints
  const videoConstraints = {
    facingMode: "user",
  };
  const styleConstraints: React.CSSProperties = {
    filter: "grayscale(100%)",
    objectFit: "cover",
    width: "clamp(320px, 80vw, 640px)",
  };

  const webcamRef = useRef<Webcam>(null);
  const capture = useCallback(async () => {
    setCountdown(3);

    for (let i = 2; i >= 0; i--) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCountdown(i);
    }

    const screenshot = webcamRef.current?.getScreenshot() ?? null;
    setImgSrc(screenshot);
    if (screenshot) {
      const resized = await convertImage(screenshot, COMPUTER_IMAGE_MAX_WIDTH);
      renderPhotoAndPrint(resized, inputText, authState.printerToken);
      setImgSrc(resized);
    }

    // clear on end
    setCountdown(null);
    setInputText(null);
  }, [inputText, authState.printerToken]);

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
      <div className="flex items-center justify-center h-[calc(100vh-3rem)] bg-white">
        <div className="flex flex-col lg:flex-row items-center justify-center text-center gap-8">
          <div className="relative w-full max-w-md flex flex-col items-center">
            <Webcam
              ref={webcamRef}
              audio={false}
              videoConstraints={videoConstraints}
              style={styleConstraints}
              screenshotFormat="image/png"
              className="rounded-lg shadow-2xl "
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
            onClick={capture}
            disabled={countdown != null}
            className="mt-2 bg-red-600 border-2 border-white rounded-full px-6 py-3 text-xl font-bold text-white hover:bg-red-500 active:scale-95 transition-transform"
          >
            {countdown !== null
              ? `Ready in ${countdown}...`
              : "Take a picture!"}
          </button>
        </div>
      </div>
      <div className="pl-4 text-black">
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
    <div>
      <WebcamDisplay />
    </div>
  );
}
