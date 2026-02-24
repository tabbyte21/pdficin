"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function Home() {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [cleanedHtml, setCleanedHtml] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewScale, setPreviewScale] = useState(1);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  const cleanHtml = useCallback((raw: string): string => {
    const overrideCSS = `
      <style data-clean-override>
        html, body {
          background: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 794px !important;
          overflow: hidden !important;
        }
        .a4-container {
          box-shadow: none !important;
          border-radius: 0 !important;
          border-top: none !important;
          max-width: none !important;
          width: 100% !important;
        }
        .lg\\:flex-row { flex-direction: row !important; }
        .md\\:flex-row { flex-direction: row !important; }
        .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .md\\:p-10 { padding: 2.5rem !important; }
        .no-print { display: none !important; }
      </style>
    `;
    const fitScript = `
      <script data-fit>
        function fitToPage() {
          document.body.style.transform = '';
          document.body.style.transformOrigin = '';
          var h = document.body.scrollHeight;
          var a4h = 1123;
          if (h > a4h) {
            var scale = a4h / h;
            document.body.style.transformOrigin = 'top left';
            document.body.style.transform = 'scale(' + scale + ')';
            document.body.style.width = (100 / scale) + '%';
          }
        }
        var _origInit = window.onload;
        window.onload = function() {
          if (_origInit) _origInit();
          setTimeout(fitToPage, 300);
          setTimeout(fitToPage, 1000);
          setTimeout(fitToPage, 2500);
        };
      <\/script>
    `;

    if (raw.includes("</head>")) {
      return raw.replace("</head>", overrideCSS + "</head>").replace("</body>", fitScript + "</body>");
    }
    return overrideCSS + fitScript + raw;
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (previewWrapperRef.current) {
        const panelWidth = previewWrapperRef.current.clientWidth - 48;
        const panelHeight = previewWrapperRef.current.clientHeight - 48;
        const scaleW = panelWidth / 794;
        const scaleH = panelHeight / 1123;
        setPreviewScale(Math.min(1, scaleW, scaleH));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [cleanedHtml]);

  const handleFile = useCallback(
    (file: File) => {
      const isHtml =
        file.name.endsWith(".html") ||
        file.name.endsWith(".htm") ||
        file.type === "text/html";
      if (!isHtml) return;

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setHtmlContent(text);
        setCleanedHtml(cleanHtml(text));
      };
      reader.readAsText(file);
    },
    [cleanHtml]
  );

  const downloadPDF = useCallback(async () => {
    const iframe = previewIframeRef.current;
    if (!iframe?.contentDocument?.documentElement) return;

    setGenerating(true);
    try {
      const doc = iframe.contentDocument;
      const canvas = await html2canvas(doc.documentElement, {
        width: 794,
        height: 1123,
        scale: 2,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
        windowHeight: 1123,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);

      const pdfName = fileName.replace(/\.(html|htm)$/i, "") || "belge";
      pdf.save(`${pdfName}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("PDF oluşturulurken hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setGenerating(false);
    }
  }, [fileName]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const reset = () => {
    setHtmlContent(null);
    setCleanedHtml(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "system-ui, sans-serif" }}>
      <header className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">
          HTML Belge &rarr; PDF
        </h1>
        <div className="flex items-center gap-3">
          {htmlContent && (
            <button
              onClick={reset}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Temizle
            </button>
          )}
          {cleanedHtml && (
            <button
              onClick={downloadPDF}
              disabled={generating}
              className="px-5 py-2 text-sm font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Olusturuluyor..." : "PDF Indir"}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Orijinal Belge
            </span>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            {!htmlContent ? (
              <div className="flex-1 p-6 flex items-center justify-center">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all py-24"
                >
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">HTML dosyasini surukleyin</p>
                    <p className="text-xs text-gray-400 mt-1">veya tiklayarak secin (.html, .htm)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,text/html"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <iframe
                  srcDoc={htmlContent}
                  className="flex-1 w-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0 flex items-center justify-between">
                  <p className="text-xs text-gray-500 truncate">{fileName}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
                  >
                    Degistir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              PDF Onizleme
            </span>
          </div>
          <div ref={previewWrapperRef} className="flex-1 overflow-auto bg-gray-200 p-6 flex justify-center">
            {cleanedHtml ? (
              <div
                style={{
                  width: 794,
                  height: 1123,
                  transformOrigin: "top center",
                  transform: `scale(${previewScale})`,
                }}
              >
                <iframe
                  ref={previewIframeRef}
                  srcDoc={cleanedHtml}
                  style={{
                    width: 794,
                    height: 1123,
                    border: "none",
                    display: "block",
                    background: "#fff",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                    overflow: "hidden",
                  }}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">HTML yuklenince sonuc burada gorunecek</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
