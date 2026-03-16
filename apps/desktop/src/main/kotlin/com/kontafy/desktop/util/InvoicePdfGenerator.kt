package com.kontafy.desktop.util

import com.kontafy.desktop.api.InvoiceDto
import com.kontafy.desktop.api.InvoiceItemDto
import com.kontafy.desktop.api.OrganizationModel
import com.kontafy.desktop.db.repositories.OrganizationRepository
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.pdmodel.PDPage
import org.apache.pdfbox.pdmodel.PDPageContentStream
import org.apache.pdfbox.pdmodel.common.PDRectangle
import org.apache.pdfbox.pdmodel.font.PDType1Font
import org.apache.pdfbox.pdmodel.font.Standard14Fonts
import java.awt.Color
import java.io.File
import java.text.NumberFormat
import java.util.Locale
import javax.swing.JFileChooser
import javax.swing.filechooser.FileNameExtensionFilter

object InvoicePdfGenerator {

    /**
     * Sanitize text before passing to PDFBox showText() —
     * control characters (newlines, tabs, etc.) are not available in
     * standard fonts and cause an encoding crash.
     */
    private fun sanitizeText(text: String): String {
        return text.replace("\n", " ").replace("\r", " ").replace("\t", " ")
            .replace(Regex("[\\x00-\\x1F\\x7F]"), "") // Remove all control characters
    }

    private val NAVY = Color(26, 35, 75)
    private val DARK_GRAY = Color(55, 65, 81)
    private val MEDIUM_GRAY = Color(107, 114, 128)
    private val LIGHT_GRAY = Color(229, 231, 235)
    private val TABLE_HEADER_BG = Color(243, 244, 246)
    private val GREEN = Color(22, 163, 74)

    fun generateAndSave(invoice: InvoiceDto): Boolean {
        val chooser = JFileChooser().apply {
            dialogTitle = "Save Invoice PDF"
            fileFilter = FileNameExtensionFilter("PDF Files", "pdf")
            selectedFile = File("${invoice.invoiceNumber}.pdf")
        }

        val result = chooser.showSaveDialog(null)
        if (result != JFileChooser.APPROVE_OPTION) return false

        var file = chooser.selectedFile
        if (!file.name.endsWith(".pdf")) {
            file = File(file.absolutePath + ".pdf")
        }

        val document = generatePdf(invoice)
        document.save(file)
        document.close()

        // Open the PDF after saving
        try {
            val desktop = java.awt.Desktop.getDesktop()
            desktop.open(file)
        } catch (_: Exception) {
            // Ignore if can't open
        }
        return true
    }

    fun printInvoice(invoice: InvoiceDto) {
        val tempFile = File.createTempFile("kontafy-invoice-", ".pdf")
        val document = generatePdf(invoice)
        document.save(tempFile)
        document.close()

        try {
            val desktop = java.awt.Desktop.getDesktop()
            desktop.print(tempFile)
        } catch (_: Exception) {
            // Fallback: open the PDF so user can print from viewer
            try {
                java.awt.Desktop.getDesktop().open(tempFile)
            } catch (_: Exception) {
                // Ignore
            }
        }
    }

    private fun generatePdf(invoice: InvoiceDto): PDDocument {
        val doc = PDDocument()
        var page = PDPage(PDRectangle.A4)
        doc.addPage(page)

        val fontBold = PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD)
        val fontRegular = PDType1Font(Standard14Fonts.FontName.HELVETICA)
        val fontItalic = PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE)

        val pageWidth = page.mediaBox.width
        val pageHeight = page.mediaBox.height
        val margin = 50f
        val contentWidth = pageWidth - 2 * margin
        val bottomMargin = margin + 40f // Reserve space for footer

        // Load organization details — use invoice's orgId if available
        val org: OrganizationModel? = try {
            val repo = OrganizationRepository()
            val orgId = invoice.orgId
            if (orgId != null) repo.getById(orgId) ?: repo.getAll().firstOrNull()
            else repo.getAll().firstOrNull()
        } catch (e: Exception) { e.printStackTrace(); null }
        val companyName = org?.name?.takeIf { it.isNotBlank() } ?: "KONTAFY"
        val companyGstin = org?.gstin
        val companyAddress = org?.address
        val companyPhone = org?.phone
        val companyEmail = org?.email

        var cs = PDPageContentStream(doc, page)

        var y = pageHeight - margin

        fun checkPageBreak(requiredSpace: Float = 60f) {
            if (y < bottomMargin + requiredSpace) {
                cs.close()
                page = PDPage(PDRectangle.A4)
                doc.addPage(page)
                cs = PDPageContentStream(doc, page)
                y = pageHeight - margin
            }
        }

        // ===== HEADER SECTION =====
        // Company name
        cs.setNonStrokingColor(NAVY)
        cs.beginText()
        val companyFontSize = if (companyName.length > 20) 16f else 22f
        cs.setFont(fontBold, companyFontSize)
        cs.newLineAtOffset(margin, y)
        cs.showText(sanitizeText(companyName.uppercase()))
        cs.endText()

        // "TAX INVOICE" label on the right
        val invoiceLabel = "TAX INVOICE"
        val labelWidth = fontBold.getStringWidth(invoiceLabel) / 1000 * 18
        cs.beginText()
        cs.setFont(fontBold, 18f)
        cs.newLineAtOffset(pageWidth - margin - labelWidth, y)
        cs.showText(sanitizeText(invoiceLabel))
        cs.endText()

        y -= 14f

        // Company details below name
        cs.setNonStrokingColor(MEDIUM_GRAY)
        val details = mutableListOf<String>()
        companyGstin?.let { details.add("GSTIN: $it") }
        companyAddress?.let { details.add(it) }
        val contactLine = listOfNotNull(companyPhone, companyEmail).joinToString(" | ")
        if (contactLine.isNotBlank()) details.add(contactLine)

        details.forEach { line ->
            cs.beginText()
            cs.setFont(fontRegular, 8f)
            cs.newLineAtOffset(margin, y)
            cs.showText(sanitizeText(line.take(80)))
            cs.endText()
            y -= 11f
        }
        if (details.isEmpty()) {
            y -= 11f // maintain spacing if no details
        }

        y -= 8f

        // Horizontal line
        cs.setStrokingColor(NAVY)
        cs.setLineWidth(2f)
        cs.moveTo(margin, y)
        cs.lineTo(pageWidth - margin, y)
        cs.stroke()

        y -= 25f

        // ===== INVOICE META (Left: Invoice details, Right: Dates) =====
        cs.setNonStrokingColor(DARK_GRAY)

        // Left column — Invoice number
        cs.beginText()
        cs.setFont(fontRegular, 9f)
        cs.newLineAtOffset(margin, y)
        cs.showText(sanitizeText("Invoice No."))
        cs.endText()
        cs.beginText()
        cs.setFont(fontBold, 12f)
        cs.newLineAtOffset(margin, y - 14f)
        cs.showText(sanitizeText(invoice.invoiceNumber))
        cs.endText()

        // Right column — Dates
        val rightCol = pageWidth - margin - 150f
        cs.beginText()
        cs.setFont(fontRegular, 9f)
        cs.newLineAtOffset(rightCol, y)
        cs.showText(sanitizeText("Issue Date"))
        cs.endText()
        cs.beginText()
        cs.setFont(fontBold, 10f)
        cs.newLineAtOffset(rightCol, y - 14f)
        cs.showText(sanitizeText(invoice.issueDate))
        cs.endText()

        cs.beginText()
        cs.setFont(fontRegular, 9f)
        cs.newLineAtOffset(rightCol + 80f, y)
        cs.showText(sanitizeText("Due Date"))
        cs.endText()
        cs.beginText()
        cs.setFont(fontBold, 10f)
        cs.newLineAtOffset(rightCol + 80f, y - 14f)
        cs.showText(sanitizeText(invoice.dueDate))
        cs.endText()

        y -= 40f

        // ===== BILL TO / SHIP TO =====
        // Bill To box
        val boxHeight = 80f
        val halfWidth = (contentWidth - 20f) / 2

        // Bill To background
        cs.setNonStrokingColor(TABLE_HEADER_BG)
        cs.addRect(margin, y - boxHeight, halfWidth, boxHeight)
        cs.fill()

        cs.setNonStrokingColor(NAVY)
        cs.beginText()
        cs.setFont(fontBold, 9f)
        cs.newLineAtOffset(margin + 12f, y - 16f)
        cs.showText(sanitizeText("BILL TO"))
        cs.endText()

        cs.setNonStrokingColor(DARK_GRAY)
        cs.beginText()
        cs.setFont(fontBold, 11f)
        cs.newLineAtOffset(margin + 12f, y - 32f)
        cs.showText(sanitizeText(invoice.customerName))
        cs.endText()

        // Place of supply if available
        invoice.placeOfSupply?.let { pos ->
            cs.beginText()
            cs.setFont(fontRegular, 9f)
            cs.newLineAtOffset(margin + 12f, y - 46f)
            cs.showText(sanitizeText("Place of Supply: $pos"))
            cs.endText()
        }

        // Status box on the right
        val statusText = invoice.status.uppercase()
        val statusColor = when (invoice.status.uppercase()) {
            "PAID" -> GREEN
            "SENT" -> Color(59, 130, 246)
            "OVERDUE" -> Color(220, 38, 38)
            "DRAFT" -> MEDIUM_GRAY
            else -> DARK_GRAY
        }

        val statusBoxX = margin + halfWidth + 20f
        cs.setNonStrokingColor(TABLE_HEADER_BG)
        cs.addRect(statusBoxX, y - boxHeight, halfWidth, boxHeight)
        cs.fill()

        cs.setNonStrokingColor(NAVY)
        cs.beginText()
        cs.setFont(fontBold, 9f)
        cs.newLineAtOffset(statusBoxX + 12f, y - 16f)
        cs.showText(sanitizeText("STATUS"))
        cs.endText()

        cs.setNonStrokingColor(statusColor)
        cs.beginText()
        cs.setFont(fontBold, 14f)
        cs.newLineAtOffset(statusBoxX + 12f, y - 36f)
        cs.showText(sanitizeText(statusText))
        cs.endText()

        // Currency
        cs.setNonStrokingColor(DARK_GRAY)
        cs.beginText()
        cs.setFont(fontRegular, 9f)
        cs.newLineAtOffset(statusBoxX + 12f, y - 54f)
        cs.showText(sanitizeText("Currency: ${invoice.currency}"))
        cs.endText()

        y -= boxHeight + 25f

        // ===== LINE ITEMS TABLE =====
        val colX = floatArrayOf(margin, margin + 30f, margin + 230f, margin + 290f, margin + 360f, margin + 430f)
        val colHeaders = arrayOf("#", "Description", "HSN", "Qty", "Rate", "Amount")
        val colWidths = floatArrayOf(30f, 200f, 60f, 70f, 70f, contentWidth - 430f)
        val tableRight = pageWidth - margin

        // Table header background
        val headerHeight = 28f
        cs.setNonStrokingColor(NAVY)
        cs.addRect(margin, y - headerHeight, contentWidth, headerHeight)
        cs.fill()

        // Table header text
        cs.setNonStrokingColor(Color.WHITE)
        cs.beginText()
        cs.setFont(fontBold, 9f)
        var headerY = y - 18f
        cs.newLineAtOffset(colX[0] + 8f, headerY)
        cs.showText(sanitizeText(colHeaders[0]))
        cs.endText()

        for (i in 1 until colHeaders.size) {
            cs.beginText()
            cs.setFont(fontBold, 9f)
            cs.newLineAtOffset(colX[i] + 4f, headerY)
            cs.showText(sanitizeText(colHeaders[i]))
            cs.endText()
        }

        y -= headerHeight

        // Table rows
        val rowHeight = 26f
        invoice.items.forEachIndexed { index, item ->
            checkPageBreak(rowHeight + 10f)
            val isAlternate = index % 2 == 1
            if (isAlternate) {
                cs.setNonStrokingColor(Color(249, 250, 251))
                cs.addRect(margin, y - rowHeight, contentWidth, rowHeight)
                cs.fill()
            }

            // Row border bottom
            cs.setStrokingColor(LIGHT_GRAY)
            cs.setLineWidth(0.5f)
            cs.moveTo(margin, y - rowHeight)
            cs.lineTo(tableRight, y - rowHeight)
            cs.stroke()

            val textY = y - 17f
            cs.setNonStrokingColor(DARK_GRAY)

            // #
            cs.beginText()
            cs.setFont(fontRegular, 9f)
            cs.newLineAtOffset(colX[0] + 8f, textY)
            cs.showText(sanitizeText("${index + 1}"))
            cs.endText()

            // Description (truncate if too long)
            val desc = if (item.description.length > 35) item.description.take(35) + "..." else item.description
            cs.beginText()
            cs.setFont(fontRegular, 9f)
            cs.newLineAtOffset(colX[1] + 4f, textY)
            cs.showText(sanitizeText(desc))
            cs.endText()

            // HSN
            cs.beginText()
            cs.setFont(fontRegular, 9f)
            cs.newLineAtOffset(colX[2] + 4f, textY)
            cs.showText(sanitizeText(item.hsnCode ?: "-"))
            cs.endText()

            // Qty
            cs.beginText()
            cs.setFont(fontRegular, 9f)
            cs.newLineAtOffset(colX[3] + 4f, textY)
            cs.showText(sanitizeText(formatQty(item.quantity)))
            cs.endText()

            // Rate
            cs.beginText()
            cs.setFont(fontRegular, 9f)
            cs.newLineAtOffset(colX[4] + 4f, textY)
            cs.showText(sanitizeText(formatAmount(item.unitPrice)))
            cs.endText()

            // Amount
            cs.beginText()
            cs.setFont(fontBold, 9f)
            cs.newLineAtOffset(colX[5] + 4f, textY)
            cs.showText(sanitizeText(formatAmount(item.amount)))
            cs.endText()

            y -= rowHeight
        }

        // Table bottom border
        cs.setStrokingColor(NAVY)
        cs.setLineWidth(1f)
        cs.moveTo(margin, y)
        cs.lineTo(tableRight, y)
        cs.stroke()

        y -= 20f

        // ===== TOTALS SECTION (Right-aligned) =====
        checkPageBreak(120f)
        val totalsX = pageWidth - margin - 200f
        val totalsValueX = pageWidth - margin - 10f
        val lineSpacing = 18f

        fun drawTotalRow(label: String, value: String, bold: Boolean = false, color: Color = DARK_GRAY) {
            cs.setNonStrokingColor(color)
            cs.beginText()
            cs.setFont(if (bold) fontBold else fontRegular, if (bold) 11f else 9f)
            cs.newLineAtOffset(totalsX, y)
            cs.showText(sanitizeText(label))
            cs.endText()

            val valWidth = (if (bold) fontBold else fontRegular).getStringWidth(sanitizeText(value)) / 1000 * (if (bold) 11f else 9f)
            cs.beginText()
            cs.setFont(if (bold) fontBold else fontRegular, if (bold) 11f else 9f)
            cs.newLineAtOffset(totalsValueX - valWidth, y)
            cs.showText(sanitizeText(value))
            cs.endText()
            y -= lineSpacing
        }

        val subtotal = if (invoice.subtotal > 0) invoice.subtotal else invoice.items.sumOf { it.amount }
        drawTotalRow("Subtotal", formatCurrencyPdf(subtotal, invoice.currency))

        if (invoice.discountAmount > 0) {
            drawTotalRow("Discount", "- ${formatCurrencyPdf(invoice.discountAmount, invoice.currency)}")
        }

        // Tax breakdown
        val totalCgst = invoice.items.sumOf { it.cgstAmount }
        val totalSgst = invoice.items.sumOf { it.sgstAmount }
        val totalIgst = invoice.items.sumOf { it.igstAmount }
        val totalCess = invoice.items.sumOf { it.cessAmount }

        if (totalCgst > 0) drawTotalRow("CGST", formatCurrencyPdf(totalCgst, invoice.currency))
        if (totalSgst > 0) drawTotalRow("SGST", formatCurrencyPdf(totalSgst, invoice.currency))
        if (totalIgst > 0) drawTotalRow("IGST", formatCurrencyPdf(totalIgst, invoice.currency))
        if (totalCess > 0) drawTotalRow("Cess", formatCurrencyPdf(totalCess, invoice.currency))

        if (invoice.taxAmount > 0 && totalCgst == 0.0 && totalSgst == 0.0 && totalIgst == 0.0) {
            drawTotalRow("Tax", formatCurrencyPdf(invoice.taxAmount, invoice.currency))
        }

        // Total line
        cs.setStrokingColor(NAVY)
        cs.setLineWidth(1f)
        cs.moveTo(totalsX, y + 8f)
        cs.lineTo(totalsValueX, y + 8f)
        cs.stroke()
        y -= 4f

        drawTotalRow("TOTAL", formatCurrencyPdf(invoice.amount, invoice.currency), bold = true, color = NAVY)

        if (invoice.amountPaid > 0) {
            drawTotalRow("Amount Paid", formatCurrencyPdf(invoice.amountPaid, invoice.currency), color = GREEN)
        }
        if (invoice.amountDue > 0) {
            drawTotalRow("Amount Due", formatCurrencyPdf(invoice.amountDue, invoice.currency), bold = true, color = Color(220, 38, 38))
        }

        y -= 15f

        // ===== AMOUNT IN WORDS =====
        val rupees = invoice.amount.toLong()
        val paise = ((invoice.amount - rupees) * 100).toLong()
        val amountInWords = if (paise > 0) {
            "${numberToWords(rupees)} Rupees and ${numberToWords(paise)} Paise Only"
        } else {
            "${numberToWords(rupees)} Rupees Only"
        }
        checkPageBreak(40f)
        cs.setNonStrokingColor(DARK_GRAY)
        cs.beginText()
        cs.setFont(fontItalic, 9f)
        cs.newLineAtOffset(margin, y)
        cs.showText(sanitizeText("Amount in words: $amountInWords"))
        cs.endText()

        y -= 30f

        // ===== NOTES / TERMS =====
        if (!invoice.notes.isNullOrBlank() || !invoice.terms.isNullOrBlank()) {
            cs.setStrokingColor(LIGHT_GRAY)
            cs.setLineWidth(0.5f)
            cs.moveTo(margin, y)
            cs.lineTo(pageWidth - margin, y)
            cs.stroke()
            y -= 18f

            invoice.notes?.let { notes ->
                cs.setNonStrokingColor(NAVY)
                cs.beginText()
                cs.setFont(fontBold, 9f)
                cs.newLineAtOffset(margin, y)
                cs.showText(sanitizeText("Notes:"))
                cs.endText()
                y -= 14f
                cs.setNonStrokingColor(DARK_GRAY)
                cs.beginText()
                cs.setFont(fontRegular, 9f)
                cs.newLineAtOffset(margin, y)
                cs.showText(sanitizeText(notes.take(100)))
                cs.endText()
                y -= 18f
            }

            invoice.terms?.let { terms ->
                cs.setNonStrokingColor(NAVY)
                cs.beginText()
                cs.setFont(fontBold, 9f)
                cs.newLineAtOffset(margin, y)
                cs.showText(sanitizeText("Terms & Conditions:"))
                cs.endText()
                y -= 14f
                cs.setNonStrokingColor(DARK_GRAY)
                cs.beginText()
                cs.setFont(fontRegular, 9f)
                cs.newLineAtOffset(margin, y)
                cs.showText(sanitizeText(terms.take(100)))
                cs.endText()
                y -= 18f
            }
        }

        // ===== FOOTER =====
        val footerY = margin + 20f
        cs.setStrokingColor(LIGHT_GRAY)
        cs.setLineWidth(0.5f)
        cs.moveTo(margin, footerY + 10f)
        cs.lineTo(pageWidth - margin, footerY + 10f)
        cs.stroke()

        // Authorized Signatory (right)
        cs.setNonStrokingColor(DARK_GRAY)
        val sigText = "Authorized Signatory"
        val sigWidth = fontRegular.getStringWidth(sigText) / 1000 * 9f
        cs.beginText()
        cs.setFont(fontRegular, 9f)
        cs.newLineAtOffset(pageWidth - margin - sigWidth, footerY - 6f)
        cs.showText(sanitizeText(sigText))
        cs.endText()

        // Signature line
        cs.setStrokingColor(DARK_GRAY)
        cs.setLineWidth(0.5f)
        cs.moveTo(pageWidth - margin - sigWidth - 10f, footerY + 2f)
        cs.lineTo(pageWidth - margin, footerY + 2f)
        cs.stroke()

        // Footer left — generated by
        cs.setNonStrokingColor(MEDIUM_GRAY)
        cs.beginText()
        cs.setFont(fontRegular, 7f)
        cs.newLineAtOffset(margin, footerY - 6f)
        cs.showText(sanitizeText("Generated by Kontafy Accounting Platform"))
        cs.endText()

        cs.close()
        return doc
    }

    private fun formatAmount(amount: Double): String {
        val fmt = NumberFormat.getNumberInstance(Locale("en", "IN"))
        fmt.minimumFractionDigits = 2
        fmt.maximumFractionDigits = 2
        return fmt.format(amount)
    }

    private fun formatCurrencyPdf(amount: Double, currency: String = "INR"): String {
        val symbol = when (currency) {
            "INR" -> "Rs."
            "USD" -> "$"
            "EUR" -> "EUR "
            "GBP" -> "GBP "
            else -> currency
        }
        return "$symbol${formatAmount(amount)}"
    }

    private fun formatQty(qty: Double): String {
        return if (qty == qty.toLong().toDouble()) qty.toLong().toString() else qty.toString()
    }

    private fun numberToWords(n: Long): String {
        if (n == 0L) return "Zero"

        val ones = arrayOf("", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen")
        val tens = arrayOf("", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety")

        fun twoDigits(n: Int): String {
            if (n < 20) return ones[n]
            val t = tens[n / 10]
            val o = ones[n % 10]
            return if (o.isEmpty()) t else "$t $o"
        }

        fun threeDigits(n: Int): String {
            if (n == 0) return ""
            if (n < 100) return twoDigits(n)
            return "${ones[n / 100]} Hundred${if (n % 100 != 0) " and ${twoDigits(n % 100)}" else ""}"
        }

        // Indian numbering: Crore, Lakh, Thousand, Hundred
        var remaining = n
        val parts = mutableListOf<String>()

        val crore = (remaining / 10000000).toInt()
        remaining %= 10000000
        val lakh = (remaining / 100000).toInt()
        remaining %= 100000
        val thousand = (remaining / 1000).toInt()
        remaining %= 1000
        val rest = remaining.toInt()

        if (crore > 0) parts.add("${twoDigits(crore)} Crore")
        if (lakh > 0) parts.add("${twoDigits(lakh)} Lakh")
        if (thousand > 0) parts.add("${twoDigits(thousand)} Thousand")
        if (rest > 0) parts.add(threeDigits(rest))

        return parts.joinToString(" ")
    }
}
