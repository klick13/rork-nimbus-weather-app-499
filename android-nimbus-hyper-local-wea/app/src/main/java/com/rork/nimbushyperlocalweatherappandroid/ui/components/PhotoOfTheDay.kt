package com.rork.nimbushyperlocalweatherappandroid.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonPurple
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun PhotoOfTheDay(
    conditionId: String,
    modifier: Modifier = Modifier,
) {
    val (gradient, label, caption) = when (conditionId) {
        "clear" -> Triple(
            listOf(Color(0xFF0A0E1A), Color(0xFF101428), Color(0xFF1A1F3A)),
            "Clear Skies",
            "A perfect day for outdoor adventures.",
        )
        "partly-cloudy" -> Triple(
            listOf(Color(0xFF090D1A), Color(0xFF0D1020), Color(0xFF13162A)),
            "Partly Cloudy",
            "Sun and clouds create dramatic skies.",
        )
        "cloudy" -> Triple(
            listOf(Color(0xFF090B14), Color(0xFF0D1020), Color(0xFF13162A)),
            "Overcast",
            "Soft diffused light settles over the landscape.",
        )
        "rainy" -> Triple(
            listOf(Color(0xFF050910), Color(0xFF0A0E1A), Color(0xFF0E1224)),
            "Rainy Day",
            "Rain nourishes the earth and clears the air.",
        )
        "snow" -> Triple(
            listOf(Color(0xFF040710), Color(0xFF070911), Color(0xFF0B0E1A)),
            "Snowfall",
            "A winter wonderland blankets the ground.",
        )
        else -> Triple(
            listOf(Color(0xFF070B14), Color(0xFF0A0E1A), Color(0xFF101428)),
            "Today's Weather",
            "Nature paints the sky with beauty.",
        )
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(
                Brush.verticalGradient(gradient),
                RoundedCornerShape(16.dp),
            )
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(20.dp),
    ) {
        Text(
            text = "PHOTO OF THE DAY",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Accent.copy(alpha = 0.7f),
            letterSpacing = 1.2.sp,
        )

        Spacer(modifier = Modifier.height(12.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color(0xFF00C9E8).copy(alpha = 0.08f),
                            Color(0xFF3DFF9A).copy(alpha = 0.04f),
                            Color(0xFFBF40FF).copy(alpha = 0.06f),
                        ),
                    ),
                    RoundedCornerShape(12.dp),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = label,
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = TextPrimary.copy(alpha = 0.15f),
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        Text(
            text = caption,
            fontSize = 14.sp,
            color = TextSecondary,
            lineHeight = 20.sp,
        )
    }
}
