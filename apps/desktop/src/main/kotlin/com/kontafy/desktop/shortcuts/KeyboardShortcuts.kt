package com.kontafy.desktop.shortcuts

import androidx.compose.ui.input.key.*
import com.kontafy.desktop.navigation.Screen

/**
 * Tally-style keyboard shortcuts for Kontafy Desktop.
 *
 * Navigation:
 *   Alt+G      → Global Search / Go To
 *   Esc        → Go Back
 *   Ctrl+D     → Dashboard
 *
 * Voucher/Entry Shortcuts (Tally F-key style):
 *   F4         → Payments (Contra)
 *   F5         → Record Payment
 *   F6         → Record Receipt / Payment
 *   F7         → Journal Entry
 *   F8         → Create Invoice (Sales)
 *   F9         → Purchase Orders
 *
 * Module Navigation:
 *   Alt+I      → Invoices
 *   Alt+C      → Customers
 *   Alt+A      → Chart of Accounts
 *   Alt+J      → Journal Entries
 *   Alt+P      → Products / Inventory
 *   Alt+B      → Bank Accounts
 *   Alt+E      → E-Way Bills
 *
 * Reports:
 *   Alt+T      → Trial Balance
 *   Alt+L      → Profit & Loss
 *   Alt+Shift+B → Balance Sheet
 *   Alt+R      → Reports Hub
 *
 * GST:
 *   Alt+Shift+G → GST Dashboard
 *   Alt+1       → GSTR-1
 *   Alt+3       → GSTR-3B
 *
 * Actions:
 *   Ctrl+S     → Save (handled per-screen)
 *   Ctrl+P     → Print (handled per-screen)
 *   Ctrl+N     → New / Create (context-aware)
 *   Ctrl+E     → Export (handled per-screen)
 *   Ctrl+F     → Search / Filter (handled per-screen)
 *   Ctrl+Q     → Quit application
 *   F1         → Help / Settings
 *   F2         → Change Date (handled per-screen)
 *   F11        → Settings
 *   F12        → Settings / Configuration
 *   Ctrl+Shift+S → Sync Status
 */
object KeyboardShortcuts {

    data class ShortcutAction(
        val screen: Screen? = null,
        val action: String? = null,
    )

    /**
     * Process a key event and return the target Screen or action, or null if no shortcut matched.
     */
    fun handleKeyEvent(event: KeyEvent): ShortcutAction? {
        if (event.type != KeyEventType.KeyDown) return null

        val isCtrl = event.isCtrlPressed
        val isAlt = event.isAltPressed
        val isShift = event.isShiftPressed

        return when {
            // === F-Key Voucher Shortcuts (Tally-style) ===
            !isCtrl && !isAlt && event.key == Key.F4 -> ShortcutAction(screen = Screen.Payments)
            !isCtrl && !isAlt && event.key == Key.F5 -> ShortcutAction(screen = Screen.RecordPayment)
            !isCtrl && !isAlt && event.key == Key.F6 -> ShortcutAction(screen = Screen.RecordPayment)
            !isCtrl && !isAlt && event.key == Key.F7 -> ShortcutAction(screen = Screen.CreateJournalEntry)
            !isCtrl && !isAlt && event.key == Key.F8 -> ShortcutAction(screen = Screen.CreateInvoice)
            !isCtrl && !isAlt && event.key == Key.F9 -> ShortcutAction(screen = Screen.PurchaseOrderList)

            // === F-Key Utility ===
            !isCtrl && !isAlt && event.key == Key.F1 -> ShortcutAction(screen = Screen.Settings)
            !isCtrl && !isAlt && event.key == Key.F2 -> ShortcutAction(action = "change_date")
            !isCtrl && !isAlt && event.key == Key.F11 -> ShortcutAction(screen = Screen.Settings)
            !isCtrl && !isAlt && event.key == Key.F12 -> ShortcutAction(screen = Screen.Settings)

            // === Ctrl Shortcuts ===
            isCtrl && !isAlt && !isShift && event.key == Key.D -> ShortcutAction(screen = Screen.Dashboard)
            isCtrl && !isAlt && !isShift && event.key == Key.N -> ShortcutAction(action = "new")
            isCtrl && !isAlt && !isShift && event.key == Key.S -> ShortcutAction(action = "save")
            isCtrl && !isAlt && !isShift && event.key == Key.P -> ShortcutAction(action = "print")
            isCtrl && !isAlt && !isShift && event.key == Key.E -> ShortcutAction(action = "export")
            isCtrl && !isAlt && !isShift && event.key == Key.F -> ShortcutAction(action = "search")
            isCtrl && !isAlt && !isShift && event.key == Key.Q -> ShortcutAction(action = "quit")
            isCtrl && !isAlt && isShift && event.key == Key.S -> ShortcutAction(screen = Screen.SyncStatus)

            // === Alt + Letter Navigation ===
            !isCtrl && isAlt && !isShift && event.key == Key.G -> ShortcutAction(action = "goto")
            !isCtrl && isAlt && !isShift && event.key == Key.I -> ShortcutAction(screen = Screen.InvoiceList)
            !isCtrl && isAlt && !isShift && event.key == Key.C -> ShortcutAction(screen = Screen.CustomerList)
            !isCtrl && isAlt && !isShift && event.key == Key.A -> ShortcutAction(screen = Screen.ChartOfAccounts)
            !isCtrl && isAlt && !isShift && event.key == Key.J -> ShortcutAction(screen = Screen.JournalEntries)
            !isCtrl && isAlt && !isShift && event.key == Key.P -> ShortcutAction(screen = Screen.ProductList)
            !isCtrl && isAlt && !isShift && event.key == Key.B -> ShortcutAction(screen = Screen.BankAccounts)
            !isCtrl && isAlt && !isShift && event.key == Key.E -> ShortcutAction(screen = Screen.EWayBillList)
            !isCtrl && isAlt && !isShift && event.key == Key.W -> ShortcutAction(screen = Screen.Warehouses)
            !isCtrl && isAlt && !isShift && event.key == Key.Q -> ShortcutAction(screen = Screen.QuotationList)

            // === Alt + Letter Reports ===
            !isCtrl && isAlt && !isShift && event.key == Key.T -> ShortcutAction(screen = Screen.TrialBalance)
            !isCtrl && isAlt && !isShift && event.key == Key.L -> ShortcutAction(screen = Screen.ProfitLoss)
            !isCtrl && isAlt && !isShift && event.key == Key.R -> ShortcutAction(screen = Screen.ReportsHub)

            // === Alt + Shift ===
            !isCtrl && isAlt && isShift && event.key == Key.B -> ShortcutAction(screen = Screen.BalanceSheet)
            !isCtrl && isAlt && isShift && event.key == Key.G -> ShortcutAction(screen = Screen.GSTDashboard)
            !isCtrl && isAlt && isShift && event.key == Key.C -> ShortcutAction(screen = Screen.CashFlow)

            // === Alt + Number ===
            !isCtrl && isAlt && event.key == Key.One -> ShortcutAction(screen = Screen.GSTR1)
            !isCtrl && isAlt && event.key == Key.Three -> ShortcutAction(screen = Screen.GSTR3B)

            // === Shortcuts page ===
            isCtrl && !isAlt && event.key == Key.Slash -> ShortcutAction(screen = Screen.Shortcuts)

            // === Escape ===
            !isCtrl && !isAlt && event.key == Key.Escape -> ShortcutAction(action = "back")

            else -> null
        }
    }

    /**
     * Returns the full shortcut reference grouped by category, for display in help/settings.
     */
    fun getShortcutReference(): List<ShortcutCategory> = listOf(
        ShortcutCategory(
            "Voucher Entry (Tally-style)", listOf(
                ShortcutInfo("F4", "Payments"),
                ShortcutInfo("F5", "Record Payment"),
                ShortcutInfo("F6", "Record Receipt"),
                ShortcutInfo("F7", "New Journal Entry"),
                ShortcutInfo("F8", "New Invoice (Sales)"),
                ShortcutInfo("F9", "Purchase Orders"),
            )
        ),
        ShortcutCategory(
            "Navigation", listOf(
                ShortcutInfo("Ctrl+D", "Dashboard"),
                ShortcutInfo("Alt+I", "Invoices"),
                ShortcutInfo("Alt+C", "Customers"),
                ShortcutInfo("Alt+A", "Chart of Accounts"),
                ShortcutInfo("Alt+J", "Journal Entries"),
                ShortcutInfo("Alt+P", "Products / Inventory"),
                ShortcutInfo("Alt+B", "Bank Accounts"),
                ShortcutInfo("Alt+E", "E-Way Bills"),
                ShortcutInfo("Alt+W", "Warehouses"),
                ShortcutInfo("Alt+Q", "Quotations"),
                ShortcutInfo("Esc", "Go Back"),
            )
        ),
        ShortcutCategory(
            "Reports", listOf(
                ShortcutInfo("Alt+R", "Reports Hub"),
                ShortcutInfo("Alt+T", "Trial Balance"),
                ShortcutInfo("Alt+L", "Profit & Loss"),
                ShortcutInfo("Alt+Shift+B", "Balance Sheet"),
                ShortcutInfo("Alt+Shift+C", "Cash Flow"),
            )
        ),
        ShortcutCategory(
            "GST & Tax", listOf(
                ShortcutInfo("Alt+Shift+G", "GST Dashboard"),
                ShortcutInfo("Alt+1", "GSTR-1"),
                ShortcutInfo("Alt+3", "GSTR-3B"),
            )
        ),
        ShortcutCategory(
            "Actions", listOf(
                ShortcutInfo("Ctrl+N", "New / Create"),
                ShortcutInfo("Ctrl+S", "Save"),
                ShortcutInfo("Ctrl+P", "Print"),
                ShortcutInfo("Ctrl+E", "Export"),
                ShortcutInfo("Ctrl+F", "Search / Filter"),
                ShortcutInfo("Alt+G", "Go To (Global Search)"),
                ShortcutInfo("F2", "Change Date"),
                ShortcutInfo("Ctrl+Shift+S", "Sync Status"),
                ShortcutInfo("F1 / F11 / F12", "Settings"),
                ShortcutInfo("Ctrl+Q", "Quit"),
            )
        ),
    )
}

data class ShortcutCategory(
    val name: String,
    val shortcuts: List<ShortcutInfo>,
)

data class ShortcutInfo(
    val keys: String,
    val description: String,
)
