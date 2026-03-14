package com.kontafy.desktop.util

import java.io.File
import javax.swing.JFileChooser
import javax.swing.filechooser.FileNameExtensionFilter

object CsvExporter {
    fun export(fileName: String, headers: List<String>, rows: List<List<String>>) {
        val chooser = JFileChooser().apply {
            dialogTitle = "Export CSV"
            selectedFile = File("$fileName.csv")
            fileFilter = FileNameExtensionFilter("CSV files", "csv")
        }
        if (chooser.showSaveDialog(null) == JFileChooser.APPROVE_OPTION) {
            val file = chooser.selectedFile
            val csvContent = buildString {
                appendLine(headers.joinToString(",") { "\"${it.replace("\"", "\"\"")}\"" })
                rows.forEach { row ->
                    appendLine(row.joinToString(",") { "\"${it.replace("\"", "\"\"")}\"" })
                }
            }
            file.writeText(csvContent)
            try { java.awt.Desktop.getDesktop().open(file) } catch (_: Exception) {}
        }
    }
}
