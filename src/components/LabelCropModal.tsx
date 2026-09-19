import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Printer, Usb, Wifi, Crop, Download, RefreshCw, 
  Settings, CheckCircle2, AlertCircle, FileText, ArrowRight, ExternalLink 
} from 'lucide-react';

interface LabelCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  initialAwb?: string;
}

export default function LabelCropModal({ isOpen, onClose, initialUrl, initialAwb }: LabelCropModalProps) {
  const [labelUrl, setLabelUrl] = useState(initialUrl || '');
  const [awbInput, setAwbInput] = useState(initialAwb || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Cropped Result
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [cropDimensions, setCropDimensions] = useState<{ width: number; height: number } | null>(null);

  // Label Size Presets
  const [selectedSize, setSelectedSize] = useState<'75x110' | '75x125' | '75x130' | 'auto'>('75x110');
  
  // IP Printer Settings (Saved to localStorage)
  const [printerIp, setPrinterIp] = useState(() => localStorage.getItem('thermal_printer_ip') || '192.168.29.2');
  const [printerPort, setPrinterPort] = useState(() => localStorage.getItem('thermal_printer_port') || '9100');
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  
  // Printing status
  const [isPrinting, setIsPrinting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Save IP settings to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem('thermal_printer_ip', printerIp);
    localStorage.setItem('thermal_printer_port', printerPort);
  }, [printerIp, printerPort]);

  // Load when opened
  useEffect(() => {
    if (isOpen) {
      if (initialAwb) {
        setAwbInput(initialAwb);
        fetchLabelByAwb(initialAwb);
      } else if (initialUrl) {
        setLabelUrl(initialUrl);
        loadAndProcessPdf(initialUrl);
      }
    } else {
      setCroppedDataUrl(null);
      setError(null);
      setStatusMsg(null);
    }
  }, [isOpen, initialUrl, initialAwb]);

  // Resolve any external or S3 URLs through the server-side proxy to prevent CORS failures
  const getProxiedUrl = (url: string) => {
    if (!url) return url;
    const trimmed = url.trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
    if (trimmed.startsWith('/')) return trimmed;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (typeof window !== 'undefined' && trimmed.startsWith(window.location.origin)) {
        return trimmed;
      }
      return `/api/delhivery/proxy-pdf?url=${encodeURIComponent(trimmed)}`;
    }
    return trimmed;
  };

  const fetchLabelByAwb = async (awb: string) => {
    if (!awb.trim()) return;
    const cleanAwb = awb.trim();

    // If user pasted a URL into the AWB box, handle it gracefully
    if (cleanAwb.startsWith('http://') || cleanAwb.startsWith('https://')) {
      setLabelUrl(cleanAwb);
      return loadAndProcessPdf(cleanAwb);
    }

    setIsLoading(true);
    setError(null);
    setStatusMsg("Fetching label from Delhivery...");
    try {
      // Use the server proxy endpoint which streams binary PDF buffer with CORS headers
      const proxyUrl = `/api/delhivery/label/${encodeURIComponent(cleanAwb)}.pdf`;
      setLabelUrl(proxyUrl);
      await loadAndProcessPdf(proxyUrl);
    } catch (e: any) {
      setError("Failed to fetch label for AWB: " + e.message);
      setIsLoading(false);
    }
  };

  // Dynamically load PDF.js if not already present
  const ensurePdfJsLoaded = async (): Promise<any> => {
    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjs);
      };
      script.onerror = () => reject(new Error("Failed to load PDF engine"));
      document.head.appendChild(script);
    });
  };

  const loadAndProcessPdf = async (urlOrData: string | ArrayBuffer) => {
    setIsLoading(true);
    setError(null);
    setStatusMsg("Loading and processing label...");
    try {
      const pdfjs = await ensurePdfJsLoaded();

      let docSource: any;
      if (typeof urlOrData === 'string') {
        const trimmed = urlOrData.trim();

        // If user typed an AWB number directly into the URL input box
        if (/^\d{8,16}$/.test(trimmed)) {
          setAwbInput(trimmed);
          return fetchLabelByAwb(trimmed);
        }

        const finalUrl = getProxiedUrl(trimmed);
        setStatusMsg("Fetching PDF data from server...");
        const res = await fetch(finalUrl);
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          throw new Error(`Server returned ${res.status}: ${errText || res.statusText}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        docSource = { data: new Uint8Array(arrayBuffer) };
      } else {
        docSource = { data: new Uint8Array(urlOrData) };
      }

      setStatusMsg("Rendering label and removing blank margins...");
      const loadingTask = pdfjs.getDocument(docSource);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      // Render at high resolution (scale 3x, identical to baseScale in Android PdfProcessor.kt)
      const scale = 3.0;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not initialize 2D context");

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Crop whitespace using identical algorithm from Android PdfProcessor.kt
      const croppedCanvas = cropWhitespace(canvas);
      setCroppedDataUrl(croppedCanvas.toDataURL('image/png'));
      setCropDimensions({ width: croppedCanvas.width, height: croppedCanvas.height });
      setIsLoading(false);
      setStatusMsg(null);
    } catch (e: any) {
      console.error("PDF Processing error:", e);
      setError("Error processing PDF label: " + (e.message || "Invalid PDF"));
      setIsLoading(false);
    }
  };

  /**
   * Whitespace crop matching PdfProcessor.kt cropWhitespace logic:
   * Scans pixel by pixel, finds bounds of non-white pixels (r < 245 || g < 245 || b < 245),
   * adds a 4px margin, and crops to the bounding box.
   */
  const cropWhitespace = (source: HTMLCanvasElement): HTMLCanvasElement => {
    const width = source.width;
    const height = source.height;
    const ctx = source.getContext('2d');
    if (!ctx) return source;

    const imgData = ctx.getImageData(0, 0, width, height);
    const pixels = imgData.data;

    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + (x * 4);
        const r = pixels[idx];
        const g = pixels[idx + 1];
        const b = pixels[idx + 2];
        const a = pixels[idx + 3];

        if (a > 50 && (r < 245 || g < 245 || b < 245)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const margin = 4;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(width - 1, maxX + margin);
    maxY = Math.min(height - 1, maxY + margin);

    if (minX >= maxX || minY >= maxY) return source; // Nothing to crop

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;

    const cropped = document.createElement('canvas');
    cropped.width = cropWidth;
    cropped.height = cropHeight;
    const croppedCtx = cropped.getContext('2d');
    if (!croppedCtx) return source;

    croppedCtx.drawImage(source, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return cropped;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        loadAndProcessPdf(reader.result as ArrayBuffer);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  /**
   * Print via USB Thermal Printer / System Driver:
   * Formats the cropped image with zero margin onto 75mm label roll using @media print.
   */
  const handlePrintUsbDriver = () => {
    if (!croppedDataUrl) return;

    const [sizeW, sizeH] = selectedSize === '75x110' ? [75, 110] 
      : selectedSize === '75x125' ? [75, 125]
      : selectedSize === '75x130' ? [75, 130]
      : [75, 120];

    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) {
      alert("Please allow popups to enable direct thermal printing.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thermal Label Print</title>
          <style>
            @page {
              size: ${sizeW}mm ${sizeH}mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              width: ${sizeW}mm;
              height: ${sizeH}mm;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
            }
            img {
              max-width: 98%;
              max-height: 98%;
              width: auto;
              height: auto;
              display: block;
              image-rendering: -webkit-optimize-contrast;
            }
          </style>
        </head>
        <body>
          <img src="${croppedDataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  /**
   * Direct WebUSB Print (if user has a WebUSB-capable thermal printer):
   */
  const handleDirectWebUsb = async () => {
    if (!(navigator as any).usb) {
      alert("WebUSB is supported in Chrome/Edge on desktop. For other browsers, please use the 'Print via USB / Driver' button.");
      return;
    }
    try {
      setIsPrinting(true);
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      await device.claimInterface(0);

      const escposData = generateEscPosData();
      const endpoint = device.configuration.interfaces[0].alternate.endpoints.find((e: any) => e.direction === 'out');
      if (!endpoint) throw new Error("No output endpoint found on USB printer.");

      await device.transferOut(endpoint.endpointNumber, escposData);
      await device.close();
      alert("Print sent successfully to USB Thermal Printer!");
    } catch (err: any) {
      console.warn("WebUSB:", err);
      // If WebUSB was cancelled or unsupported, fallback to standard driver print
      handlePrintUsbDriver();
    } finally {
      setIsPrinting(false);
    }
  };

  /**
   * Generate ESC/POS byte commands matching PrinterHelper.kt printImage:
   * 576 dots width, raster bit image GS v 0, luma < 200 threshold, 3 feeds, paper cut.
   */
  const generateEscPosData = (): Uint8Array => {
    const targetWidth = 576; // standard for 80mm ESC/POS
    const img = new Image();
    img.src = croppedDataUrl!;

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    const scale = targetWidth / (cropDimensions?.width || targetWidth);
    canvas.height = Math.round((cropDimensions?.height || targetWidth) * scale);

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;

    const width = Math.floor((canvas.width + 7) / 8) * 8;
    const height = canvas.height;

    // Header: ESC @ (init)
    const initCmd = [0x1B, 0x40];

    // GS v 0 header
    const xL = (width / 8) % 256;
    const xH = Math.floor((width / 8) / 256);
    const yL = height % 256;
    const yH = Math.floor(height / 256);
    const header = [0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH];

    const rowSize = width / 8;
    const rasterBytes: number[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x += 8) {
        let byteVal = 0;
        for (let b = 0; b < 8; b++) {
          if (x + b < canvas.width) {
            const idx = (y * canvas.width + (x + b)) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const bl = pixels[idx + 2];
            const luma = r * 0.299 + g * 0.587 + bl * 0.114;
            if (luma < 200) {
              byteVal |= (1 << (7 - b));
            }
          }
        }
        rasterBytes.push(byteVal);
      }
    }

    // Feed 3 lines and cut paper (matching PrinterHelper.kt)
    const footer = [0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0x00];

    const totalBytes = new Uint8Array([...initCmd, ...header, ...rasterBytes, ...footer]);
    return totalBytes;
  };

  /**
   * Direct IP Printer Print:
   * Sends raw ESC/POS commands to printer IP (e.g. 192.168.29.2:9100)
   */
  const handlePrintIp = async () => {
    if (!croppedDataUrl) return;
    setIsPrinting(true);
    setStatusMsg(`Connecting to IP Thermal Printer at ${printerIp}:${printerPort}...`);

    try {
      const escposData = generateEscPosData();
      
      // Attempt direct local network send via fetch (works if printer has HTTP raw port or via local bridge)
      const res = await fetch(`http://${printerIp}:${printerPort}`, {
        method: 'POST',
        mode: 'no-cors',
        body: escposData
      });

      setStatusMsg("Print command sent to IP printer!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      console.warn("Direct IP print:", e);
      // Explain to user and offer standard print
      alert(`Could not establish raw TCP connection directly from browser to ${printerIp}:${printerPort}. \n\nPlease use "Print via USB / Driver" which sends this exact cropped 75mm label directly to your printer!`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadImage = () => {
    if (!croppedDataUrl) return;
    const a = document.createElement('a');
    a.href = croppedDataUrl;
    a.download = `label_${awbInput || 'cropped'}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Delhivery Label Cropper & Thermal Print</h2>
              <p className="text-xs text-slate-400">Auto-crop blank whitespace and print to 75mm thermal rolls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Control Bar: AWB / URL / File upload */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            <div className="md:col-span-5 flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter AWB Number..."
                value={awbInput}
                onChange={(e) => setAwbInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-teal-500 outline-none font-mono"
              />
              <button
                onClick={() => fetchLabelByAwb(awbInput)}
                disabled={isLoading || !awbInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-50"
              >
                Fetch
              </button>
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <input
                type="text"
                placeholder="Or paste Label PDF URL..."
                value={labelUrl}
                onChange={(e) => setLabelUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-teal-500 outline-none"
              />
              <button
                onClick={() => loadAndProcessPdf(labelUrl)}
                disabled={isLoading || !labelUrl.trim()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-50"
              >
                Load
              </button>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <label className="w-full cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-teal-500 text-slate-600 hover:text-teal-700 text-xs font-medium bg-white transition-colors">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Upload PDF</span>
                <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

          </div>

          {/* Status / Errors */}
          {statusMsg && (
            <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              <span>{statusMsg}</span>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Label Preview & Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Cropped Label Preview */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 bg-slate-100/70 border border-slate-200 rounded-3xl min-h-[350px]">
              {isLoading ? (
                <div className="text-center py-10 space-y-3">
                  <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">Auto-cropping label whitespace...</p>
                </div>
              ) : croppedDataUrl ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-2 bg-white rounded-2xl shadow-md border border-slate-300 max-w-xs sm:max-w-sm">
                    <img 
                      src={croppedDataUrl} 
                      alt="Cropped Delhivery Label" 
                      className="w-full h-auto rounded-lg object-contain"
                    />
                  </div>
                  {cropDimensions && (
                    <span className="text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
                      Cropped Resolution: {cropDimensions.width} × {cropDimensions.height}px
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Crop className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
                  <p className="text-xs">No label loaded yet. Enter an AWB or upload a PDF above.</p>
                </div>
              )}
            </div>

            {/* Right: Thermal Printer Settings & Actions */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Size Presets */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Thermal Label Size
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['75x110', '75x125', '75x130'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 px-2 text-xs rounded-xl font-medium border text-center transition-all ${
                        selectedSize === size
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {size} mm
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Exact standard sizes from your Label-Crop Android app.
                </span>
              </div>

              {/* IP / USB Printer Configuration Toggle */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800">IP Printer Configuration</span>
                  </div>
                  <button
                    onClick={() => setShowPrinterSettings(!showPrinterSettings)}
                    className="text-[11px] text-teal-600 hover:text-teal-800 font-medium"
                  >
                    {showPrinterSettings ? "Hide Settings" : "Edit IP"}
                  </button>
                </div>

                {showPrinterSettings ? (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Printer IP Address</label>
                        <input
                          type="text"
                          value={printerIp}
                          onChange={(e) => setPrinterIp(e.target.value)}
                          placeholder="192.168.29.2"
                          className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Port</label>
                        <input
                          type="text"
                          value={printerPort}
                          onChange={(e) => setPrinterPort(e.target.value)}
                          placeholder="9100"
                          className="w-full mt-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Saved in your browser storage automatically.
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-mono text-slate-800">{printerIp}:{printerPort}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">Active</span>
                  </div>
                )}
              </div>

              {/* Print Action Buttons */}
              <div className="space-y-2.5 pt-2">
                
                {/* 1. Print to USB / Driver (Recommended) */}
                <button
                  onClick={handlePrintUsbDriver}
                  disabled={!croppedDataUrl || isPrinting}
                  className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print via USB Thermal Printer</span>
                </button>

                {/* 2. Direct IP Network Print */}
                <button
                  onClick={handlePrintIp}
                  disabled={!croppedDataUrl || isPrinting}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Wifi className="w-4 h-4 text-teal-400" />
                  <span>Send to IP Printer ({printerIp})</span>
                </button>

                {/* 3. Direct WebUSB Connection */}
                <button
                  onClick={handleDirectWebUsb}
                  disabled={!croppedDataUrl || isPrinting}
                  className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Usb className="w-3.5 h-3.5 text-slate-500" />
                  <span>Direct WebUSB (Raw ESC/POS)</span>
                </button>

                {/* 4. Download Cropped Image */}
                <button
                  onClick={handleDownloadImage}
                  disabled={!croppedDataUrl}
                  className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Cropped PNG</span>
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
