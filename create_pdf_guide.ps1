# PowerShell script to convert the markdown guide to PDF

# Check if Pandoc is installed
$pandocInstalled = $null
try {
    $pandocInstalled = Get-Command pandoc -ErrorAction Stop
} catch {
    Write-Host "Pandoc is not installed. Installing Pandoc via Chocolatey..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    $chocoInstalled = $null
    try {
        $chocoInstalled = Get-Command choco -ErrorAction Stop
    } catch {
        Write-Host "Chocolatey is not installed. Installing Chocolatey..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
    }
    
    # Install Pandoc using Chocolatey
    choco install pandoc -y
}

# Define file paths
$markdownFile = "$PSScriptRoot\CLIENT_INSTALLATION_GUIDE.md"
$pdfFile = "$PSScriptRoot\Shivam_Transport_Installation_Guide.pdf"

# Check if the markdown file exists
if (-not (Test-Path $markdownFile)) {
    Write-Host "Error: Could not find the markdown file at $markdownFile" -ForegroundColor Red
    exit 1
}

# Convert markdown to PDF using Pandoc
Write-Host "Converting markdown to PDF..." -ForegroundColor Yellow
try {
    pandoc $markdownFile -o $pdfFile --pdf-engine=wkhtmltopdf
    
    if (Test-Path $pdfFile) {
        Write-Host "PDF created successfully at: $pdfFile" -ForegroundColor Green
    } else {
        Write-Host "Error: PDF creation failed." -ForegroundColor Red
    }
} catch {
    Write-Host "Error during PDF conversion: $_" -ForegroundColor Red
    Write-Host "Alternative method: You can manually convert the markdown file using an online converter or other tools." -ForegroundColor Yellow
}

Write-Host "Press Enter to exit"
Read-Host