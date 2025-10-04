const express = require('express');
const multer = require('multer');
const latex = require('node-latex');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer();

app.use(express.json({ limit: '10mb' }));

app.post('/compile', upload.none(), async (req, res) => {
  try {
    const latexCode = req.body.latex;
    
    if (!latexCode) {
      return res.status(400).json({ error: 'No LaTeX code provided' });
    }

    // Create a temporary file for the LaTeX code
    const tempFile = path.join(__dirname, `temp-${Date.now()}.tex`);
    fs.writeFileSync(tempFile, latexCode);

    // Compile to PDF
    const input = fs.createReadStream(tempFile);
    const output = fs.createWriteStream('output.pdf');
    
    const pdf = latex(input);
    pdf.pipe(output);

    pdf.on('error', (err) => {
      fs.unlinkSync(tempFile);
      res.status(500).json({ error: err.message });
    });

    pdf.on('finish', () => {
      fs.unlinkSync(tempFile);
      res.setHeader('Content-Type', 'application/pdf');
      res.sendFile(path.join(__dirname, 'output.pdf'));
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LaTeX compiler running on port ${PORT}`);
});