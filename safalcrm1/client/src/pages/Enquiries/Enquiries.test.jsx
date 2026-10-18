import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EnquiriesPage from "./index";
import { fetchJson, patchJson } from "../../services/api";

jest.mock("../../services/api", () => ({
  fetchJson: jest.fn(),
  patchJson: jest.fn(),
}));

const enquiry = {
  id: 91,
  company_name: "Acme Cosmetics",
  contact_person: "Avery Buyer",
  email: "buyer@example.com",
  phone: "1234567890",
  product_interest: "Perfume",
  quantity: 100,
  message: "Please send pricing details.",
  status: "New",
  created_at: "2026-10-16T10:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchJson.mockResolvedValue({ enquiries: [enquiry], limit: 25, offset: 0, total: 1 });
  patchJson.mockResolvedValue({ message: "Enquiry status updated." });
});

test("loads B2B enquiries and lets an admin update their status", async () => {
  render(<EnquiriesPage userRole="admin" />);

  expect(await screen.findByText("Acme Cosmetics")).toBeInTheDocument();
  expect(screen.getByText("Showing 1–1 of 1 enquiries")).toBeInTheDocument();
  expect(screen.getByText("Please send pricing details.")).toBeInTheDocument();

  fireEvent.change(screen.getByRole("combobox", { name: "Status for Acme Cosmetics" }), {
    target: { value: "Contacted" },
  });

  await waitFor(() => expect(patchJson).toHaveBeenCalledWith("/enquiries/91/status", { status: "Contacted" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Status updated for Acme Cosmetics.");
  expect(screen.getByRole("combobox", { name: "Status for Acme Cosmetics" })).toHaveValue("Contacted");
});

test("applies search and status filters to the enquiry request", async () => {
  render(<EnquiriesPage userRole="staff" />);
  await screen.findByText("Acme Cosmetics");

  fireEvent.change(screen.getByRole("searchbox", { name: "Search enquiries" }), {
    target: { value: "Avery" },
  });
  fireEvent.change(screen.getByLabelText("Enquiry status"), {
    target: { value: "Qualified" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

  await waitFor(() => expect(fetchJson).toHaveBeenLastCalledWith(
    "/enquiries?limit=25&offset=0&search=Avery&status=Qualified"
  ));
});
