import { fireEvent, render, screen } from "@testing-library/react-native";

import { type Account, createAccount, placeOrder } from "@/engine/paperBroker";

import { OrderPanel } from "../OrderPanel";

const PRICE = 22_000;

function longAccount(quantity: number, at = PRICE): Account {
  const result = placeOrder(createAccount(), {
    side: "buy",
    quantity,
    price: at,
    time: 0,
  });
  if (!result.ok) throw new Error(result.reason);
  return result.account;
}

async function setup(overrides: Partial<Parameters<typeof OrderPanel>[0]> = {}) {
  const props = {
    account: createAccount(),
    price: PRICE,
    isHalted: false,
    onOrder: jest.fn(() => ({ ok: true as const, account: createAccount() })),
    onSetStopLoss: jest.fn(() => ({ ok: true as const, account: createAccount() })),
    ...overrides,
  };
  await render(<OrderPanel {...props} />);
  return props;
}

describe("OrderPanel", () => {
  it("sends the chosen quantity with each order", async () => {
    const props = await setup();

    await fireEvent.press(screen.getByLabelText("Increase quantity"));
    await fireEvent.press(screen.getByLabelText("Increase quantity"));
    await fireEvent.press(screen.getByText("Buy"));
    await fireEvent.press(screen.getByText("Sell"));

    expect(props.onOrder).toHaveBeenNthCalledWith(1, "buy", 3);
    expect(props.onOrder).toHaveBeenNthCalledWith(2, "sell", 3);
  });

  it("doesn't let the quantity drop below one", async () => {
    const props = await setup();

    await fireEvent.press(screen.getByLabelText("Decrease quantity"));
    await fireEvent.press(screen.getByText("Buy"));

    expect(props.onOrder).toHaveBeenCalledWith("buy", 1);
  });

  it("fills in the largest affordable quantity with Max", async () => {
    const props = await setup();

    await fireEvent.press(screen.getByLabelText("Use maximum quantity"));
    await fireEvent.press(screen.getByText("Buy"));

    // (10,00,000 - 20) / 22,000 = 45.4
    expect(props.onOrder).toHaveBeenCalledWith("buy", 45);
  });

  it("shows why an order was rejected", async () => {
    await setup({
      onOrder: jest.fn(() => ({ ok: false as const, reason: "Not enough funds" })),
    });

    await fireEvent.press(screen.getByText("Buy"));

    expect(screen.getByText("Not enough funds")).toBeTruthy();
  });

  it("disables orders during a halt", async () => {
    const props = await setup({ isHalted: true });

    await fireEvent.press(screen.getByText("Buy"));

    expect(props.onOrder).not.toHaveBeenCalled();
    expect(
      screen.getByText("Trading is halted. Orders reopen with the market."),
    ).toBeTruthy();
  });

  it("shows the open position and its P&L", async () => {
    // Long 10 from 22,000, now at 22,100: +1,000 open, minus ₹20 brokerage overall
    await setup({ account: longAccount(10), price: 22_100 });

    expect(screen.getByText("Long 10 @ 22,000.00")).toBeTruthy();
    expect(screen.getByText("Open +₹1,000.00")).toBeTruthy();
    expect(screen.getByText("+₹980.00")).toBeTruthy();
  });

  it("only offers a stop-loss when there's a position", async () => {
    await setup();

    expect(screen.queryByLabelText("Stop-loss price")).toBeNull();
  });

  it("sets a stop-loss from the typed price", async () => {
    const props = await setup({ account: longAccount(10) });

    await fireEvent.changeText(screen.getByLabelText("Stop-loss price"), "21,850.5");
    await fireEvent.press(screen.getByText("Set"));

    expect(props.onSetStopLoss).toHaveBeenCalledWith(21_850.5);
  });

  it("asks for a price instead of sending an empty stop-loss", async () => {
    const props = await setup({ account: longAccount(10) });

    await fireEvent.press(screen.getByText("Set"));

    expect(props.onSetStopLoss).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a stop-loss price")).toBeTruthy();
  });

  it("shows an active stop-loss and lets you remove it", async () => {
    const props = await setup({ account: { ...longAccount(10), stopLoss: 21_800 } });

    expect(screen.getByText("Stop-loss at 21,800.00")).toBeTruthy();
    await fireEvent.press(screen.getByText("Remove"));

    expect(props.onSetStopLoss).toHaveBeenCalledWith(null);
  });
});
