// @vitest-environment jsdom
/**
 * Delivery screen addresses (2026-11-13): UPDATE edits the address on screen (PUT /order/delivery-address/{id}) and is
 * disabled while typing new data; new addresses for a customer come only from MORE ADDRESS. Save Delivery on a changed
 * saved address edits it too (it used to POST a new copy); only a number with no address yet gets one created.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

vi.mock("../api/axiosInstance", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));

import { store } from "../app/store";
import { clearCart, setContactNo, setDeliveryDetails } from "../features/pos/terminal/store/posSlice";
import PosDeliveryPage from "../features/pos/customer/pages/PosDeliveryPage";

const saved = { addressId: 42, mobileNo: "98765432", customerName: "test", flatNo: "aa", buildingNo: "aa", roadNo: "aa", blockNo: "aa", area: "aa", note: "aa" };

const mockServer = (addresses: unknown[]) => {
  vi.mocked(axiosInstance.get).mockImplementation(async (url: string) => {
    if (url.startsWith("/order/delivery-address/")) return { data: { isSuccess: true, data: addresses } } as never;
    return { data: { isSuccess: true, data: [] } } as never;
  });
  vi.mocked(axiosInstance.put).mockResolvedValue({ data: { isSuccess: true, message: "Updated", data: { id: 42 } } } as never);
  vi.mocked(axiosInstance.post).mockResolvedValue({ data: { isSuccess: true, message: "Saved", data: { id: 77 } } } as never);
};

const renderPage = () =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <PosDeliveryPage />
      </MemoryRouter>
    </Provider>
  );

const typeMobile = (value: string) => fireEvent.change(screen.getByLabelText(/Mobile No/i), { target: { value } });
const updateButton = () => screen.getByRole("button", { name: /^update$/i }) as HTMLButtonElement;

// The confirm dialog (Modal) watches its size; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  store.dispatch(clearCart());
});

describe("Delivery: UPDATE edits the address on screen", () => {
  it("a saved address is loaded → UPDATE sends PUT for that address, never a new POST", async () => {
    mockServer([saved]);
    renderPage();
    typeMobile("98765432");
    await waitFor(() => expect((screen.getByLabelText(/Flat No/i) as HTMLInputElement).value).toBe("aa"));
    expect(updateButton().disabled).toBe(false);

    fireEvent.change(screen.getByLabelText(/Flat No/i), { target: { value: "B12" } });
    fireEvent.click(updateButton());

    await waitFor(() => expect(axiosInstance.put).toHaveBeenCalledTimes(1));
    const [url, body] = vi.mocked(axiosInstance.put).mock.calls[0];
    expect(url).toBe("/order/delivery-address/42");
    expect(body).toMatchObject({ addressId: 42, mobileNo: "98765432", flatNo: "B12", customerName: "test" });
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it("new data (number with no saved address) → UPDATE is disabled", async () => {
    mockServer([]);
    renderPage();
    typeMobile("91111111");
    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
    expect(updateButton().disabled).toBe(true);
  });
});

describe("Delivery: Save Delivery", () => {
  it("a changed saved address is edited (PUT), not saved again as a new address", async () => {
    mockServer([saved]);
    renderPage();
    typeMobile("98765432");
    await waitFor(() => expect((screen.getByLabelText(/Area/i) as HTMLInputElement).value).toBe("aa"));
    fireEvent.change(screen.getByLabelText(/Area/i), { target: { value: "Seef" } });
    fireEvent.click(screen.getByRole("button", { name: /save delivery/i }));

    await waitFor(() => expect(axiosInstance.put).toHaveBeenCalledTimes(1));
    expect(vi.mocked(axiosInstance.put).mock.calls[0][0]).toBe("/order/delivery-address/42");
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  it("a number with no address yet: its first address is created (POST)", async () => {
    mockServer([]);
    renderPage();
    typeMobile("91111111");
    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(/Customer Name/i), { target: { value: "New Guy" } });
    fireEvent.change(screen.getByLabelText(/Flat No/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /save delivery/i }));

    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledWith("/order/delivery-address", expect.objectContaining({ mobileNo: "91111111", customerName: "New Guy" })));
    expect(axiosInstance.put).not.toHaveBeenCalled();
  });
});

/** Rendered as the POS opens it in a window, so leaving is visible as onCloseModal. */
const renderInWindow = () => {
  const onCloseModal = vi.fn();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <PosDeliveryPage isModal onCloseModal={onCloseModal} />
      </MemoryRouter>
    </Provider>
  );
  return onCloseModal;
};
const backButton = () => screen.getByRole("button", { name: /^pos$/i });

describe("Delivery: leaving without saving asks first (2026-11-13)", () => {
  it("something typed, Back → 'Leave without saving?'; No stays, Yes leaves", async () => {
    mockServer([]);
    const onCloseModal = renderInWindow();
    fireEvent.change(screen.getByLabelText(/Customer Name/i), { target: { value: "Walk-in" } });

    fireEvent.click(backButton());
    expect(await screen.findByText("Leave without saving?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /no, stay/i }));
    expect(onCloseModal).not.toHaveBeenCalled();
    expect(screen.queryByText("Leave without saving?")).toBeNull();

    fireEvent.click(backButton());
    fireEvent.click(await screen.findByRole("button", { name: /yes, leave/i }));
    expect(onCloseModal).toHaveBeenCalledTimes(1);
  });

  it("nothing changed: Back leaves straight away", () => {
    mockServer([]);
    const onCloseModal = renderInWindow();
    fireEvent.click(backButton());
    expect(screen.queryByText("Leave without saving?")).toBeNull();
    expect(onCloseModal).toHaveBeenCalledTimes(1);
  });

  it("after UPDATE the changes are saved: Back leaves without asking", async () => {
    mockServer([saved]);
    const onCloseModal = renderInWindow();
    typeMobile("98765432");
    await waitFor(() => expect((screen.getByLabelText(/Flat No/i) as HTMLInputElement).value).toBe("aa"));
    fireEvent.change(screen.getByLabelText(/Flat No/i), { target: { value: "B12" } });
    fireEvent.click(updateButton());
    await waitFor(() => expect(axiosInstance.put).toHaveBeenCalledTimes(1));

    fireEvent.click(backButton());
    expect(screen.queryByText("Leave without saving?")).toBeNull();
    expect(onCloseModal).toHaveBeenCalledTimes(1);
  });

  it("re-opened with a chosen address: no new lookup (it replaced the address with the first one) and no false warning", async () => {
    mockServer([{ ...saved, addressId: 41, flatNo: "FIRST" }, saved]);
    store.dispatch(setContactNo("98765432"));
    store.dispatch(setDeliveryDetails({ ...saved, contactNo: "98765432" } as never));
    const onCloseModal = renderInWindow();
    await waitFor(() => expect((screen.getByLabelText(/Flat No/i) as HTMLInputElement).value).toBe("aa"));
    await new Promise((r) => setTimeout(r, 20));
    expect(axiosInstance.get).not.toHaveBeenCalledWith(expect.stringContaining("/order/delivery-address/98765432"));
    expect((screen.getByLabelText(/Flat No/i) as HTMLInputElement).value).toBe("aa");

    fireEvent.click(backButton());
    expect(onCloseModal).toHaveBeenCalledTimes(1);
  });
});
