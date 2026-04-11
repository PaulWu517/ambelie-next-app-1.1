import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ProductData {
  name: string;
  dimensions?: string;
  period?: string;
  origin?: string;
  materials?: string;
  designer?: string;
  Manufacturer?: string;
  description?: string;
  images?: { src: string; alt: string }[];
}

export const generateProductPDF = async (
  product: ProductData,
  coverImageUrl: string = '/assets/vi/cover.jpg', // You will provide these
  backImageUrl: string = '/assets/vi/back.jpg'
) => {
  // Initialize PDF (A4 size, portrait)
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Helper to load image as base64
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error('Failed to load image:', url, e);
        reject(new Error(`Failed to load image: ${url}`));
      };
      // Try to handle protocol-relative URLs if needed, but standard URLs are better
      img.src = url.startsWith('//') ? `https:${url}` : url;
    });
  };

  try {
    // --- PAGE 1: Cover Page ---
    try {
      const coverImg = await loadImage(coverImageUrl);
      // Try to fit the cover image to the whole page, or maintain aspect ratio
      const imgRatio = coverImg.height / coverImg.width;
      const pageRatio = pageHeight / pageWidth;
      
      let drawWidth = pageWidth;
      let drawHeight = pageWidth * imgRatio;
      let x = 0;
      let y = 0;

      // Fill page logic
      if (imgRatio > pageRatio) {
        drawWidth = pageWidth;
        drawHeight = drawWidth * imgRatio;
        y = (pageHeight - drawHeight) / 2;
      } else {
        drawHeight = pageHeight;
        drawWidth = drawHeight / imgRatio;
        x = (pageWidth - drawWidth) / 2;
      }

      // Convert via canvas to standardize color space and reduce oversaturation
      const processCanvas = document.createElement('canvas');
      processCanvas.width = coverImg.width;
      processCanvas.height = coverImg.height;
      const ctx = processCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(coverImg, 0, 0);
        const processedImgData = processCanvas.toDataURL('image/jpeg', 0.85); // Lower quality slightly to prevent over-sharpening
        pdf.addImage(processedImgData, 'JPEG', x, y, drawWidth, drawHeight);
      } else {
        pdf.addImage(coverImg, 'JPEG', x, y, drawWidth, drawHeight);
      }
    } catch (e) {
      console.warn('Could not load cover image, skipping cover or using fallback');
      pdf.setFillColor(245, 240, 230); // A light beige color
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setFontSize(24);
      pdf.setTextColor(0, 0, 0);
      pdf.text('AMBELIE', pageWidth / 2, pageHeight / 2, { align: 'center' });
    }

    // --- PAGE 2: Product Info ---
    pdf.addPage();
    
    // Ensure custom fonts are loaded before rendering
    try {
      const solenaFont = new FontFace('Solena', 'url(/fonts/Solena-Regular.otf)');
      const poppinsFont = new FontFace('Poppins', 'url(/fonts/Poppins-ExtraLight.ttf)');
      await Promise.all([solenaFont.load(), poppinsFont.load()]);
      document.fonts.add(solenaFont);
      document.fonts.add(poppinsFont);
    } catch (e) {
      console.warn('Failed to load custom fonts for PDF:', e);
    }

    // Create a temporary hidden div to render the HTML for the info page
    // We use html2canvas because it handles text wrapping and custom fonts (if loaded) much better than raw jsPDF text
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px'; // Fixed width for rendering
    tempDiv.style.minHeight = '1131px'; // A4 ratio
    tempDiv.style.backgroundColor = '#F5F0E6'; // The beige background from your screenshot
    tempDiv.style.padding = '80px 60px';
    tempDiv.style.boxSizing = 'border-box';
    tempDiv.style.fontFamily = '"Solena", serif'; // 品牌衬线体
    tempDiv.style.color = '#333333';
    
    // Add Ambelie logo text at bottom
    const logoDiv = document.createElement('div');
    logoDiv.style.position = 'absolute';
    logoDiv.style.bottom = '40px';
    logoDiv.style.left = '0';
    logoDiv.style.width = '100%';
    logoDiv.style.textAlign = 'center';
    logoDiv.style.fontSize = '32px';
    logoDiv.style.letterSpacing = '8px';
    logoDiv.style.color = '#B89B6A'; // Gold-ish color from screenshot
    logoDiv.style.fontFamily = '"Solena", serif'; // 明确指定品牌衬线体
    logoDiv.innerText = 'AMBELIE';
    tempDiv.appendChild(logoDiv);

    // Title
    const title = document.createElement('h1');
    title.innerText = product.name;
    title.style.fontSize = '32px'; // 变小2号（原来是36px）
    title.style.fontWeight = 'normal';
    title.style.marginTop = '80px'; // 主标题里页面顶部的空间增大一倍（原来没有marginTop，靠的是容器的padding 80px，现在额外加80px相当于翻倍）
    title.style.marginBottom = '40px';
    title.style.lineHeight = '1.3';
    tempDiv.appendChild(title);

    // Details grid
    const detailsDiv = document.createElement('div');
    detailsDiv.style.marginBottom = '60px';
    detailsDiv.style.fontSize = '18px'; // 变小1号（原来是20px）
    detailsDiv.style.lineHeight = '1.6';
    detailsDiv.style.fontFamily = '"Poppins", sans-serif'; // 品牌无衬线体
    detailsDiv.style.fontWeight = 'normal'; // 使用normal，因为字体文件本身就是ExtraLight
    
    const addDetail = (label: string, value?: string) => {
      if (!value) return;
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.marginBottom = '8px';
      
      const lbl = document.createElement('span');
      lbl.innerText = label;
      lbl.style.width = '180px';
      lbl.style.color = '#666';
      
      const val = document.createElement('span');
      val.innerText = value;
      val.style.flex = '1';
      
      row.appendChild(lbl);
      row.appendChild(val);
      detailsDiv.appendChild(row);
    };

    addDetail('Dimensions:', product.dimensions);
    addDetail('Period:', product.period);
    addDetail('Origin:', product.origin);
    addDetail('Materials:', product.materials);
    addDetail('Designer:', product.designer);
    addDetail('Manufacturer:', product.Manufacturer);
    
    tempDiv.appendChild(detailsDiv);

    // Description
    if (product.description) {
      const desc = document.createElement('div');
      desc.innerText = product.description;
      desc.style.fontSize = '18px';
      desc.style.lineHeight = '1.8';
      desc.style.color = '#444';
      desc.style.textAlign = 'justify';
      tempDiv.appendChild(desc);
    }

    document.body.appendChild(tempDiv);
    
    // Render the div to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 1.5, // Reduced from 2 to slightly soften the text and prevent overly harsh contrast
      useCORS: true,
      backgroundColor: '#F5F0E6'
    });
    
    document.body.removeChild(tempDiv);
    
    // Lowered quality to 0.85 to match image processing and soften output colors
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);


    // --- PAGE 3+: Product Images ---
    if (product.images && product.images.length > 0) {
      for (let i = 0; i < product.images.length; i++) {
        try {
          const prodImg = await loadImage(product.images[i].src);
          pdf.addPage();
          
          // Use the same beige background
          pdf.setFillColor(245, 240, 230);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          
          // Fill the entire page with the product image (object-fit: cover)
          const imgRatio = prodImg.height / prodImg.width;
          const pageRatio = pageHeight / pageWidth;
          
          let drawWidth = pageWidth;
          let drawHeight = pageWidth * imgRatio;
          let x = 0;
          let y = 0;

          if (imgRatio > pageRatio) {
            // Image is taller than page ratio, fit to width, crop top/bottom
            drawWidth = pageWidth;
            drawHeight = drawWidth * imgRatio;
            y = (pageHeight - drawHeight) / 2;
          } else {
            // Image is wider than page ratio, fit to height, crop left/right
            drawHeight = pageHeight;
            drawWidth = drawHeight / imgRatio;
            x = (pageWidth - drawWidth) / 2;
          }
          
          // Render image through canvas to strip problematic color profiles and soften colors
          const processCanvas = document.createElement('canvas');
          processCanvas.width = prodImg.width;
          processCanvas.height = prodImg.height;
          const ctx = processCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(prodImg, 0, 0);
            const processedImgData = processCanvas.toDataURL('image/jpeg', 0.85); // 0.85 reduces the aggressive contrast/saturation of full quality
            pdf.addImage(processedImgData, 'JPEG', x, y, drawWidth, drawHeight);
          } else {
            pdf.addImage(prodImg, 'JPEG', x, y, drawWidth, drawHeight);
          }
        } catch (e) {
          console.warn('Failed to add product image to PDF', e);
        }
      }
    }

    // --- LAST PAGE: Thank you / Back Cover ---
    pdf.addPage();
    try {
      const backImg = await loadImage(backImageUrl);
      const imgRatio = backImg.height / backImg.width;
      const pageRatio = pageHeight / pageWidth;
      
      let drawWidth = pageWidth;
      let drawHeight = pageWidth * imgRatio;
      let x = 0;
      let y = 0;

      if (imgRatio > pageRatio) {
        drawWidth = pageWidth;
        drawHeight = drawWidth * imgRatio;
        y = (pageHeight - drawHeight) / 2;
      } else {
        drawHeight = pageHeight;
        drawWidth = drawHeight / imgRatio;
        x = (pageWidth - drawWidth) / 2;
      }

      pdf.addImage(backImg, 'JPEG', x, y, drawWidth, drawHeight);
    } catch (e) {
      console.warn('Could not load back image, using fallback');
      pdf.setFillColor(245, 240, 230);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setFontSize(24);
      pdf.setTextColor(0, 0, 0);
      pdf.text('THANK YOU', pageWidth / 2, pageHeight / 2, { align: 'center' });
    }

    // Save the PDF
    pdf.save(`${product.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_tearsheet.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
};