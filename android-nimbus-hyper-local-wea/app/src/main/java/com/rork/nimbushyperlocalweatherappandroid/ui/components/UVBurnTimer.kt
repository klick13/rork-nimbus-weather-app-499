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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.Accent
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBackground
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.CardBorder
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonGreen
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.NeonYellow
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TempHigh
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextPrimary
import com.rork.nimbushyperlocalweatherappandroid.ui.theme.TextSecondary

@Composable
fun UVBurnTimer(
    uvIndex: Int,
    modifier: Modifier = Modifier,
) {
    if (uvIndex == 0) return

    val burnTime = when (uvIndex) {
        in 1..2 -> 60
        in 3..5 -> 30
        in 6..7 -> 20
        in 8..10 -> 12
        else -> 7
    }

    val uvColor = when (uvIndex) {
        in 0..2 -> NeonGreen
        in 3..5 -> NeonYellow
        in 6..7 -> Color(0xFFFF9600)
        in 8..10 -> TempHigh
        else -> Color(0xFFBF40FF)
    }

    val protectionLevel = when (uvIndex) {
        in 0..2 -> "Low risk"
        in 3..5 -> "Moderate risk"
        in 6..7 -> "High risk"
        in 8..10 -> "Very high risk"
        else -> "Extreme risk"
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(CardBackground, RoundedCornerShape(16.dp))
            .border(1.dp, CardBorder, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.WbSunny,
                    contentDescription = "UV",
                    tint = uvColor,
                    modifier = Modifier.size(20.dp),
                )
                Text(
                    text = "UV Burn Timer",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                )
            }
            Box(
                modifier = Modifier
                        .background(uvColor.copy(alpha = 0.15f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(
                    text = "UV $uvIndex",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = uvColor,
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.Bottom,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "~${burnTime}min",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = uvColor,
                )
                Text(
                    text = "until sunburn",
                    fontSize = 11.sp,
                    color = TextSecondary,
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = protectionLevel,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = uvColor,
                )
                Text(
                    text = if (uvIndex >= 6) "Use SPF 30+" else "Minimal protection",
                    fontSize = 11.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}
