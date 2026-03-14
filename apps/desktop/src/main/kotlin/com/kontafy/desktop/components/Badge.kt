package com.kontafy.desktop.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.theme.KontafyColors

enum class BadgeType {
    Success,
    Info,
    Warning,
    Error,
    Neutral,
    Custom,
}

@Composable
fun KontafyBadge(
    text: String,
    modifier: Modifier = Modifier,
    type: BadgeType = BadgeType.Neutral,
    customBgColor: Color? = null,
    customTextColor: Color? = null,
) {
    val (bgColor, textColor) = when (type) {
        BadgeType.Success -> KontafyColors.StatusPaidBg to KontafyColors.StatusPaid
        BadgeType.Info -> KontafyColors.StatusSentBg to KontafyColors.StatusSent
        BadgeType.Warning -> Color(0xFFFEF3C7) to KontafyColors.Warning
        BadgeType.Error -> KontafyColors.StatusOverdueBg to KontafyColors.StatusOverdue
        BadgeType.Neutral -> KontafyColors.StatusDraftBg to KontafyColors.StatusDraft
        BadgeType.Custom -> (customBgColor ?: KontafyColors.StatusDraftBg) to (customTextColor ?: KontafyColors.StatusDraft)
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(6.dp),
        color = bgColor,
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.labelMedium,
                color = textColor,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
fun CustomerTypeBadge(type: String, modifier: Modifier = Modifier) {
    val badgeType = when (type.uppercase()) {
        "CUSTOMER" -> BadgeType.Info
        "VENDOR" -> BadgeType.Warning
        "BOTH" -> BadgeType.Success
        else -> BadgeType.Neutral
    }
    KontafyBadge(
        text = type.replaceFirstChar { it.titlecase() },
        type = badgeType,
        modifier = modifier,
    )
}
