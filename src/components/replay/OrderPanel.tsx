import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  type Account,
  type BrokerResult,
  equity,
  maxQuantity,
  netPnl,
  type Side,
  unrealizedPnl,
} from "@/engine/paperBroker";
import { type Palette, usePalette, useThemedStyles } from "@/theme";
import { formatPrice, formatRupees } from "@/utils/format";

interface Props {
  account: Account;
  price: number;
  isHalted: boolean;
  onOrder: (side: Side, quantity: number) => BrokerResult;
  onSetStopLoss: (level: number | null) => BrokerResult;
}

export function OrderPanel({ account, price, isHalted, onOrder, onSetStopLoss }: Props) {
  const colors = usePalette();
  const styles = useThemedStyles(createStyles);
  const [quantity, setQuantity] = useState(1);
  const [stopText, setStopText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const report = (result: BrokerResult) => setMessage(result.ok ? null : result.reason);

  const order = (side: Side) => report(onOrder(side, quantity));

  const setStop = () => {
    const level = Number(stopText.replace(/,/g, ""));
    if (!stopText.trim() || !Number.isFinite(level)) {
      setMessage("Enter a stop-loss price");
      return;
    }
    const result = onSetStopLoss(level);
    report(result);
    if (result.ok) setStopText("");
  };

  const { position } = account;
  const total = netPnl(account, price);
  const open = unrealizedPnl(account, price);
  // Max follows the direction that would grow the position, or buy when flat
  const maxSide: Side = position < 0 ? "sell" : "buy";

  return (
    <View style={styles.panel}>
      <View style={styles.summary}>
        <View>
          <Text style={styles.caption}>Position</Text>
          <Text style={styles.value}>
            {position === 0
              ? "None"
              : `${position > 0 ? "Long" : "Short"} ${Math.abs(position)} @ ${formatPrice(account.avgPrice)}`}
          </Text>
          {position !== 0 && (
            <Text style={[styles.small, { color: pnlColor(open, colors) }]}>
              Open {formatRupees(open, { signed: true })}
            </Text>
          )}
        </View>
        <View style={styles.right}>
          <Text style={styles.caption}>Day P&amp;L</Text>
          <Text style={[styles.value, { color: pnlColor(total, colors) }]}>
            {formatRupees(total, { signed: true })}
          </Text>
          <Text style={styles.small}>Funds {formatRupees(equity(account, price))}</Text>
        </View>
      </View>

      <View style={styles.quantityRow}>
        <Text style={styles.caption}>Qty</Text>
        <Stepper
          label="Decrease quantity"
          symbol="−"
          onPress={() => setQuantity((q) => Math.max(1, q - 1))}
        />
        <TextInput
          style={styles.quantityInput}
          value={String(quantity)}
          onChangeText={(text) =>
            setQuantity(Math.max(1, Number(text.replace(/\D/g, "")) || 1))
          }
          keyboardType="number-pad"
          selectTextOnFocus
          accessibilityLabel="Quantity"
        />
        <Stepper
          label="Increase quantity"
          symbol="+"
          onPress={() => setQuantity((q) => q + 1)}
        />
        <Pressable
          style={styles.maxButton}
          onPress={() => setQuantity(Math.max(1, maxQuantity(account, maxSide, price)))}
          accessibilityRole="button"
          accessibilityLabel="Use maximum quantity"
        >
          <Text style={styles.maxText}>Max</Text>
        </Pressable>
      </View>

      <View style={styles.buttons}>
        <OrderButton side="sell" disabled={isHalted} onPress={() => order("sell")} />
        <OrderButton side="buy" disabled={isHalted} onPress={() => order("buy")} />
      </View>

      {position !== 0 && (
        <View style={styles.stopRow}>
          {account.stopLoss === null ? (
            <>
              <TextInput
                style={styles.stopInput}
                value={stopText}
                onChangeText={setStopText}
                placeholder={`Stop-loss ${position > 0 ? "below" : "above"} ${formatPrice(price)}`}
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                accessibilityLabel="Stop-loss price"
              />
              <Pressable
                style={styles.stopButton}
                onPress={setStop}
                accessibilityRole="button"
              >
                <Text style={styles.stopButtonText}>Set</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.stopActive}>
                Stop-loss at {formatPrice(account.stopLoss)}
              </Text>
              <Pressable
                style={styles.stopButton}
                onPress={() => report(onSetStopLoss(null))}
                accessibilityRole="button"
              >
                <Text style={styles.stopButtonText}>Remove</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {isHalted && (
        <Text style={styles.halted}>
          Trading is halted. Orders reopen with the market.
        </Text>
      )}
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

function OrderButton({
  side,
  disabled,
  onPress,
}: {
  side: Side;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = usePalette();
  const styles = useThemedStyles(createStyles);
  const label = side === "buy" ? "Buy" : "Sell";
  return (
    <Pressable
      style={({ pressed }) => [
        styles.orderButton,
        { backgroundColor: side === "buy" ? colors.up : colors.down },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <Text style={styles.orderButtonText}>{label}</Text>
    </Pressable>
  );
}

function Stepper({
  label,
  symbol,
  onPress,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      style={styles.stepper}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Text style={styles.stepperText}>{symbol}</Text>
    </Pressable>
  );
}

function pnlColor(amount: number, colors: Palette) {
  if (Math.abs(amount) < 0.005) return colors.text;
  return amount > 0 ? colors.up : colors.down;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    panel: {
      gap: 12,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.grid,
    },
    summary: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    right: {
      alignItems: "flex-end",
    },
    caption: {
      fontSize: 12,
      color: colors.muted,
    },
    value: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    small: {
      fontSize: 12,
      color: colors.muted,
      fontVariant: ["tabular-nums"],
    },
    quantityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stepper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.grid,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperText: {
      fontSize: 20,
      color: colors.text,
    },
    quantityInput: {
      minWidth: 56,
      height: 36,
      textAlign: "center",
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.grid,
    },
    maxButton: {
      marginLeft: "auto",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      backgroundColor: colors.grid,
    },
    maxText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    buttons: {
      flexDirection: "row",
      gap: 12,
    },
    orderButton: {
      flex: 1,
      height: 48,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    orderButtonText: {
      color: colors.onAccent,
      fontSize: 16,
      fontWeight: "700",
    },
    disabled: {
      opacity: 0.4,
    },
    pressed: {
      opacity: 0.85,
    },
    stopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stopInput: {
      flex: 1,
      height: 40,
      paddingHorizontal: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.grid,
      color: colors.text,
    },
    stopActive: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    stopButton: {
      paddingHorizontal: 14,
      height: 40,
      borderRadius: 6,
      justifyContent: "center",
      backgroundColor: colors.grid,
    },
    stopButtonText: {
      fontWeight: "600",
      color: colors.text,
    },
    halted: {
      fontSize: 13,
      color: colors.muted,
    },
    message: {
      fontSize: 13,
      color: colors.down,
    },
  });
