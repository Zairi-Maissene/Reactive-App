function simulateOCRProcessing(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('OCR processing completed.');
      resolve();
    }, 5000); // Simulate processing for 5 seconds
  });
}

export default { simulateOCRProcessing };