const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

app.post('/compile', async (req, res) => {
  try {
    const latexCode = req.body.latex || req.body;
    
    if (!latexCode) {
      return res.status(400).json({ error: 'No LaTeX code provided' });
    }

    const timestamp = Date.now();
    const tempDir = path.join('/tmp', `latex-${timestamp}`);
    const texFile = path.join(tempDir, 'main.tex');
    const pdfFile = path.join(tempDir, 'main.pdf');

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(texFile, latexCode);

    // Compile LaTeX using pdflatex
    exec(`pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${texFile}`, 
      (error, stdout, stderr) => {
        if (error && !fs.existsSync(pdfFile)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          return res.status(500).json({ 
            error: 'LaTeX compilation failed',
            details: stderr || error.message 
          });
        }

        // Send PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');
        
        const pdfStream = fs.createReadStream(pdfFile);
        pdfStream.pipe(res);
        
        pdfStream.on('end', () => {
          fs.rmSync(tempDir, { recursive: true, force: true });
        });
      }
    );

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'LaTeX compiler service is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LaTeX compiler running on port ${PORT}`);
});
