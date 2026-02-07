# Barcode Setup Instructions

## Installation

To enable barcode generation and printing, you need to install the `jsbarcode` library:

```bash
cd client
npm install jsbarcode @types/jsbarcode
```

Or if you're using a different package manager:

```bash
# Using yarn
yarn add jsbarcode @types/jsbarcode

# Using pnpm
pnpm add jsbarcode @types/jsbarcode
```

## After Installation

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. The barcode functionality will work automatically:
   - Creating a product will generate a barcode and show it in a dialog
   - Updating a product will generate a new barcode
   - You can print barcodes using the "Print Barcode" button

## Features

- **Automatic Barcode Generation**: Barcodes are automatically generated when creating or updating products
- **Barcode Display**: After creating/updating a product, a dialog shows the barcode
- **Print Functionality**: Click "Print Barcode" to print the barcode for your barcode printer
- **Global Scanner Support**: Scan barcodes anywhere in the app (when authenticated) to automatically add products to a new bill

## Troubleshooting

If you see errors about `jsbarcode` not being found:
1. Make sure you've installed the package (see Installation above)
2. Restart your development server
3. Clear your `.next` cache if needed: `rm -rf .next`

## Note

The barcode component has a fallback that displays the barcode as text if the library is not installed, but for proper barcode generation and printing, you need to install `jsbarcode`.
