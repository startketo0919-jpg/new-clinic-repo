import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Printer, Usb, Wifi, Crop, Download, RefreshCw, 
  CheckCircle2, AlertCircle, FileText, ExternalLink, Sparkles 
} from 'lucide-react';

interface LabelCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  initialAwb?: string;
}

interface CropBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface PdfBounds {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

export default function LabelCropModal({ isOpen, onClose, initialUrl, initialAwb }: LabelCropModalProps) {
  const [labelUrl, setLabelUrl] = useState(initialUrl || '');
  const [awbInput, setAwbInput] = useState(initialAwb || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Vector PDF Engine state (Selectable text, 100% vector resolution)
  const [rawPdfBuffer, setRawPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [detectedPdfBounds, setDetectedPdfBounds] = useState<PdfBounds | null>(null);
  const [vectorPdfBlobUrl, setVectorPdfBlobUrl] = useState<string | null>(null);
  const [vectorPdfBytes, setVectorPdfBytes] = useState<Uint8Array | null>(null);
  const [previewMode, setPreviewMode] = useState<'vector' | 'image'>('vector');
  const prevBlobUrlRef = useRef<string | null>(null);

  // High-res raster canvas (for ESC/POS & fallback preview)
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [cropDimensions, setCropDimensions] = useState<{ width: number; height: number } | null>(null);

  // Thermal Roll Size Presets
  const [selectedSize, setSelectedSize] = useState<'75x110' | '75x125' | '75x130' | 'auto'>('75x110');
  
  // IP Printer Settings (Stored in localStorage)
  const [printerIp, setPrinterIp] = useState(() => localStorage.getItem('thermal_printer_ip') || '192.168.29.2');
  const [printerPort, setPrinterPort] = useState(() => localStorage.getItem('thermal_printer_port') || '9100');
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  
  // Printing status
  const [isPrinting, setIsPrinting] = useState(false);

  // Save IP settings to localStorage whenever changed
  useEffect(() => {
    localStorage.setItem('thermal_printer_ip', printerIp);
    localStorage.setItem('thermal_printer_port', printerPort);
  }, [printerIp, printerPort]);

  // Load / cleanup when modal opened or closed
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
      setRawPdfBuffer(null);
      setDetectedPdfBounds(null);
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
      setVectorPdfBlobUrl(null);
      setVectorPdfBytes(null);
      setError(null);
      setStatusMsg(null);
    }
  }, [isOpen, initialUrl, initialAwb]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
    };
  }, []);

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

  // Dynamically load pdf-lib for lossless Vector PDF manipulation
  const ensurePdfLibLoaded = async (): Promise<any> => {
    if ((window as any).PDFLib) {
      return (window as any).PDFLib;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
      script.onload = () => resolve((window as any).PDFLib);
      script.onerror = () => {
        // Fallback to unpkg CDN if cdnjs is blocked
        const fallback = document.createElement('script');
        fallback.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
        fallback.onload = () => resolve((window as any).PDFLib);
        fallback.onerror = () => reject(new Error("Failed to load PDF vector manipulation engine"));
        document.head.appendChild(fallback);
      };
      document.head.appendChild(script);
    });
  };

  // Route external URLs through server proxy to bypass CORS
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

    // If user pasted a URL into the AWB input box, route smoothly
    if (cleanAwb.startsWith('http://') || cleanAwb.startsWith('https://')) {
      setLabelUrl(cleanAwb);
      return loadAndProcessPdf(cleanAwb);
    }

    setIsLoading(true);
    setError(null);
    setStatusMsg("Fetching label from Delhivery...");
    try {
      const proxyUrl = `/api/delhivery/label/${encodeURIComponent(cleanAwb)}.pdf`;
      setLabelUrl(proxyUrl);
      await loadAndProcessPdf(proxyUrl);
    } catch (e: any) {
      setError("Failed to fetch label for AWB: " + e.message);
      setIsLoading(false);
    }
  };

  /**
   * Scan canvas pixels at high resolution to find bounds of printed ink
   */
  const getCanvasWhitespaceBox = (source: HTMLCanvasElement): CropBox => {
    const width = source.width;
    const height = source.height;
    const ctx = source.getContext('2d');
    if (!ctx) return { minX: 0, minY: 0, maxX: width, maxY: height };

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

    if (minX >= maxX || minY >= maxY) {
      return { minX: 0, minY: 0, maxX: width, maxY: height };
    }

    return { minX, minY, maxX, maxY };
  };

  const cropWhitespace = (source: HTMLCanvasElement, box: CropBox): HTMLCanvasElement => {
    const cropWidth = box.maxX - box.minX + 1;
    const cropHeight = box.maxY - box.minY + 1;

    const cropped = document.createElement('canvas');
    cropped.width = cropWidth;
    cropped.height = cropHeight;
    const croppedCtx = cropped.getContext('2d');
    if (!croppedCtx) return source;

    croppedCtx.drawImage(source, box.minX, box.minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return cropped;
  };

  /**
   * Generates a 100% Vector PDF with selectable text and crystal-clear barcodes.
   * Adjusts the MediaBox and CropBox to center on the selected thermal roll size.
   */
  const generateVectorPdf = async (
    rawBytes: ArrayBuffer,
    bounds: PdfBounds,
    targetSize: '75x110' | '75x125' | '75x130' | 'auto'
  ) => {
    try {
      const { PDFDocument } = await ensurePdfLibLoaded();
      const pdfDoc = await PDFDocument.load(rawBytes);

      // Strip any extra pages (e.g. Delhivery terms) so thermal roll prints only 1 label
      while (pdfDoc.getPageCount() > 1) {
        pdfDoc.removePage(1);
      }

      const page = pdfDoc.getPages()[0];
      const { cropX, cropY, cropW, cropH } = bounds;

      let newX = cropX;
      let newY = cropY;
      let newW = cropW;
      let newH = cropH;

      if (targetSize !== 'auto') {
        const [mmW, mmH] = targetSize === '75x110' ? [75, 110] 
          : targetSize === '75x125' ? [75, 125]
          : [75, 130];
        
        // 1 mm = 2.8346457 PDF points
        const ptW = mmW * 2.8346457;
        const ptH = mmH * 2.8346457;

        if (cropW <= ptW) {
          const diffX = ptW - cropW;
          newX = cropX - (diffX / 2);
          newW = ptW;
        }
        if (cropH <= ptH) {
          const diffY = ptH - cropH;
          newY = cropY - (diffY / 2);
          newH = ptH;
        }
      }

      // Set MediaBox and CropBox in the native PDF stream
      page.setMediaBox(newX, newY, newW, newH);
      page.setCropBox(newX, newY, newW, newH);
      page.setBleedBox(newX, newY, newW, newH);
      page.setTrimBox(newX, newY, newW, newH);

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
      }
      prevBlobUrlRef.current = blobUrl;

      setVectorPdfBytes(savedBytes);
      setVectorPdfBlobUrl(blobUrl);
    } catch (e: any) {
      console.error("Vector PDF generation error:", e);
    }
  };

  const handleSizeChange = async (size: '75x110' | '75x125' | '75x130' | 'auto') => {
    setSelectedSize(size);
    if (rawPdfBuffer && detectedPdfBounds) {
      setIsLoading(true);
      setStatusMsg(`Re-centering vector PDF to ${size === 'auto' ? 'Auto Crop' : size + ' mm'}...`);
      await generateVectorPdf(rawPdfBuffer, detectedPdfBounds, size);
      setIsLoading(false);
      setStatusMsg(null);
    }
  };

  /**
   * Main loader: fetches PDF bytes, detects whitespace bounds, and builds Vector PDF
   */
  const loadAndProcessPdf = async (urlOrData: string | ArrayBuffer) => {
    setIsLoading(true);
    setError(null);
    setStatusMsg("Loading and processing vector label...");
    try {
      const pdfjs = await ensurePdfJsLoaded();

      let arrayBuffer: ArrayBuffer;
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
        arrayBuffer = await res.arrayBuffer();
      } else {
        arrayBuffer = urlOrData;
      }

      setRawPdfBuffer(arrayBuffer);

      setStatusMsg("Scanning label layout and blank margins...");
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      // Render at high resolution (scale 3.0) to accurately detect ink bounds
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

      // Detect ink bounding box in canvas pixels
      const box = getCanvasWhitespaceBox(canvas);
      
      // Convert canvas pixel coordinates to true PDF point coordinates
      const [ptX1, ptY1] = viewport.convertToPdfPoint(box.minX, box.minY);
      const [ptX2, ptY2] = viewport.convertToPdfPoint(box.maxX, box.maxY);
      const bounds: PdfBounds = {
        cropX: Math.min(ptX1, ptX2),
        cropY: Math.min(ptY1, ptY2),
        cropW: Math.max(20, Math.abs(ptX2 - ptX1)),
        cropH: Math.max(20, Math.abs(ptY2 - ptY1))
      };
      setDetectedPdfBounds(bounds);

      // Create cropped PNG for ESC/POS raster and fallback preview
      const croppedCanvas = cropWhitespace(canvas, box);
      setCroppedDataUrl(croppedCanvas.toDataURL('image/png'));
      setCropDimensions({ width: croppedCanvas.width, height: croppedCanvas.height });

      setStatusMsg("Building lossless Vector PDF (Text Selectable)...");
      await generateVectorPdf(arrayBuffer, bounds, selectedSize);

      setIsLoading(false);
      setStatusMsg(null);
    } catch (e: any) {
      console.error("PDF Processing error:", e);
      setError("Error processing PDF label: " + (e.message || "Invalid PDF"));
      setIsLoading(false);
    }
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
   * Primary Print Action: Prints the native Vector PDF directly with text selection and sharp barcodes
   */
  const handlePrintVectorPdf = () => {
    if (!vectorPdfBlobUrl) return;

    let iframe = document.getElementById('vector-pdf-print-frame') as HTMLIFrameElement | null;
    if (iframe) {
      iframe.remove();
    }

    iframe = document.createElement('iframe');
    iframe.id = 'vector-pdf-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = vectorPdfBlobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
        } catch (err) {
          console.warn("Iframe print blocked or unsupported, opening in print tab:", err);
          window.open(vectorPdfBlobUrl, '_blank');
        }
      }, 400);
    };
  };

  /**
   * Open Vector PDF in a new tab: User can select text, copy details, zoom, and print with Ctrl+P
   */
  const handleOpenVectorPdf = () => {
    if (!vectorPdfBlobUrl) return;
    const win = window.open(vectorPdfBlobUrl, '_blank');
    if (!win) {
      alert("Please allow popups to view and print the vector PDF.");
    }
  };

  /**
   * Download the lossless Vector PDF file
   */
  const handleDownloadVectorPdf = () => {
    if (!vectorPdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = vectorPdfBlobUrl;
    a.download = `delhivery_label_${awbInput || 'cropped'}_vector.pdf`;
    a.click();
  };

  /**
   * Direct WebUSB Print (if user has a WebUSB-capable thermal printer):
   */
  const handleDirectWebUsb = async () => {
    if (!(navigator as any).usb) {
      alert("WebUSB is supported in Chrome/Edge on desktop. Please use 'Print Vector PDF' instead.");
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
      handlePrintVectorPdf();
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

    // Raster bytes
    const rasterBytes: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x += 8) {
        let byteVal = 0;
        for (let b = 0; b < 8; b++) {
          const px = x + b;
          if (px < canvas.width) {
            const idx = (y * canvas.width + px) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const bl = pixels[idx + 2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * bl;
            if (luma < 200) {
              byteVal |= (1 << (7 - b));
            }
          }
        }
        rasterBytes.push(byteVal);
      }
    }

    // Line feed & Paper cut commands
    const feeds = [0x0A, 0x0A, 0x0A];
    const cutCmd = [0x1D, 0x56, 0x42, 0x00];

    const fullBuffer = new Uint8Array([
      ...initCmd,
      ...header,
      ...rasterBytes,
      ...feeds,
      ...cutCmd
    ]);

    return fullBuffer;
  };

  /**
   * Send ESC/POS data to IP Thermal Printer:
   */
  const handlePrintIp = async () => {
    if (!croppedDataUrl) return;
    setIsPrinting(true);
    setStatusMsg(`Connecting to IP printer at ${printerIp}:${printerPort}...`);

    try {
      const escposData = generateEscPosData();

      await fetch(`http://${printerIp}:${printerPort}`, {
        method: 'POST',
        mode: 'no-cors',
        body: escposData
      });

      setStatusMsg("Print command sent to IP printer!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e: any) {
      console.warn("Direct IP print:", e);
      alert(`Could not establish raw TCP connection directly from browser to ${printerIp}:${printerPort}. \n\nPlease use "Print Vector PDF" to print with maximum crispness!`);
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
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Delhivery Label Cropper & Thermal Print</h2>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full font-semibold border border-teal-500/30">
                  Vector Lossless
                </span>
              </div>
              <p className="text-xs text-slate-400">Auto-crops blank margins, preserves crisp vector barcodes and selectable text</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
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
                onKeyDown={(e) => e.key === 'Enter' && fetchLabelByAwb(awbInput)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-teal-500 outline-none font-mono"
              />
              <button
                onClick={() => fetchLabelByAwb(awbInput)}
                disabled={isLoading || !awbInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer"
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
                onKeyDown={(e) => e.key === 'Enter' && loadAndProcessPdf(labelUrl)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-teal-500 outline-none"
              />
              <button
                onClick={() => loadAndProcessPdf(labelUrl)}
                disabled={isLoading || !labelUrl.trim()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer"
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
            <div className="lg:col-span-7 flex flex-col p-4 bg-slate-100/70 border border-slate-200 rounded-3xl min-h-[480px]">
              {isLoading ? (
                <div className="text-center py-24 space-y-3 m-auto">
                  <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">Generating lossless vector label...</p>
                </div>
              ) : vectorPdfBlobUrl ? (
                <div className="flex flex-col h-full space-y-2.5">
                  
                  {/* Top Quality Banner */}
                  <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs font-bold text-emerald-800">
                        Vector PDF &bull; Text Selectable
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold">
                        <button
                          onClick={() => setPreviewMode('vector')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${previewMode === 'vector' ? 'bg-white text-teal-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Vector PDF
                        </button>
                        <button
                          onClick={() => setPreviewMode('image')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${previewMode === 'image' ? 'bg-white text-teal-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Raster Image
                        </button>
                      </div>
                      <button
                        onClick={handleOpenVectorPdf}
                        title="Open in new tab to select, zoom & print"
                        className="p-1 text-slate-500 hover:text-teal-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Main Preview Container */}
                  <div className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden flex items-center justify-center min-h-[400px]">
                    {previewMode === 'vector' ? (
                      <iframe 
                        src={`${vectorPdfBlobUrl}#toolbar=0&navpanes=0`} 
                        className="w-full h-full min-h-[400px] border-0 rounded-2xl bg-white"
                        title="Lossless Vector PDF Preview"
                      />
                    ) : (
                      <img 
                        src={croppedDataUrl!} 
                        alt="Cropped Label Preview" 
                        className="max-h-[380px] w-auto object-contain p-2"
                      />
                    )}
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-mono">
                    <span>Roll: {selectedSize === 'auto' ? 'Tight Auto-Crop' : `${selectedSize} mm`}</span>
                    <span className="text-emerald-700 font-semibold">Lossless Vector (Infinite DPI)</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 space-y-2 m-auto">
                  <Crop className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
                  <p className="text-xs">No label loaded yet. Enter an AWB or paste a URL above.</p>
                </div>
              )}
            </div>

            {/* Right: Thermal Printer Settings & Actions */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Size Presets */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Thermal Label Roll Size
                  </span>
                  <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold border border-teal-200">
                    Vector Preserved
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['75x110', '75x125', '75x130', 'auto'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => handleSizeChange(size)}
                      className={`py-2 px-1.5 text-xs rounded-xl font-medium border text-center transition-all cursor-pointer ${
                        selectedSize === size
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {size === 'auto' ? 'Auto Crop' : `${size} mm`}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Select 75x110mm for standard rolls or Auto Crop to fit content tightly.
                </span>
              </div>

              {/* Print Action Buttons */}
              <div className="space-y-2.5 pt-1">
                
                {/* 1. Print Vector PDF (Highest Quality) - PRIMARY */}
                <button
                  onClick={handlePrintVectorPdf}
                  disabled={!vectorPdfBlobUrl || isPrinting}
                  className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Vector PDF (Highest Quality)</span>
                </button>

                {/* 2. Open Vector PDF in Tab (Select Text / Fullscreen Print) */}
                <button
                  onClick={handleOpenVectorPdf}
                  disabled={!vectorPdfBlobUrl}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-teal-400" />
                  <span>Open PDF in Tab (Select Text & Print)</span>
                </button>

                {/* 3. Download Vector PDF (.pdf) */}
                <button
                  onClick={handleDownloadVectorPdf}
                  disabled={!vectorPdfBlobUrl}
                  className="w-full py-2 px-4 rounded-xl border border-teal-300 bg-teal-50/60 hover:bg-teal-100 text-teal-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>Download Vector PDF (.pdf)</span>
                </button>

              </div>

              {/* IP Printer Configuration Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800">IP Thermal Printer</span>
                  </div>
                  <button
                    onClick={() => setShowPrinterSettings(!showPrinterSettings)}
                    className="text-[11px] text-teal-600 hover:text-teal-800 font-medium cursor-pointer"
                  >
                    {showPrinterSettings ? "Hide" : "Configure IP"}
                  </button>
                </div>

                {showPrinterSettings ? (
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Printer IP</label>
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
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-mono text-slate-800">{printerIp}:{printerPort}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">Active</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handlePrintIp}
                    disabled={!croppedDataUrl || isPrinting}
                    className="py-2 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Wifi className="w-3.5 h-3.5 text-slate-500" />
                    <span>Send to IP</span>
                  </button>
                  <button
                    onClick={handleDirectWebUsb}
                    disabled={!croppedDataUrl || isPrinting}
                    className="py-2 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Usb className="w-3.5 h-3.5 text-slate-400" />
                    <span>WebUSB</span>
                  </button>
                </div>
              </div>

              {/* Secondary Download Option */}
              <button
                onClick={handleDownloadImage}
                disabled={!croppedDataUrl}
                className="w-full py-2 px-4 rounded-xl border border-dashed border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Cropped PNG Image</span>
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
