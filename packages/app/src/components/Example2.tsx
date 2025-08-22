import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Plus } from "lucide-react";
import { useVoiceElement } from "chant-sdk";
import { CREATE_SUPPORT_TICKET_ACTION_ID } from "@/lib/utils";

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Closed";
  createdAt: string;
}

export function Example2() {
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: "1",
      title: "Login issue",
      description: "Cannot login to the application",
      priority: "High",
      status: "Open",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      title: "Feature request",
      description: "Add dark mode support",
      priority: "Medium",
      status: "In Progress",
      createdAt: "2024-01-14",
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium" as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newTicket: SupportTicket = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: "Open",
      createdAt: new Date().toISOString().split("T")[0],
    };

    setTickets((prev) => [newTicket, ...prev]);
    setFormData({ title: "", description: "", priority: "Medium" });
    setIsDialogOpen(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Support Tickets</h1>
          <p className="text-lg text-muted-foreground">
            Manage and track support tickets
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              id="create-ticket-btn"
              ref={useVoiceElement(CREATE_SUPPORT_TICKET_ACTION_ID, {
                type: "button",
                label: "Create Ticket",
              })}
              data-testid="create-ticket-btn"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Ticket
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                Fill out the form below to create a new support ticket.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block mb-2 text-sm font-medium"
                >
                  Title *
                </label>
                <Input
                  id="ticket-title"
                  ref={useVoiceElement(CREATE_SUPPORT_TICKET_ACTION_ID, {
                    type: "input",
                    label: "Ticket Title",
                  })}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter ticket title"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block mb-2 text-sm font-medium"
                >
                  Description *
                </label>
                <textarea
                  ref={useVoiceElement(CREATE_SUPPORT_TICKET_ACTION_ID, {
                    type: "textarea",
                    label: "Ticket Description",
                  })}
                  id="ticket-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe the issue or request"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="block mb-2 text-sm font-medium"
                >
                  Priority
                </label>
                <select
                  ref={useVoiceElement(CREATE_SUPPORT_TICKET_ACTION_ID, {
                    type: "select",
                    label: "Ticket Priority",
                  })}
                  id="ticket-priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value as "Low" | "Medium" | "High",
                    }))
                  }
                  className="flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  ref={useVoiceElement(CREATE_SUPPORT_TICKET_ACTION_ID, {
                    type: "button",
                    label: "Submit Ticket",
                  })}
                  id="submit-ticket-btn"
                  type="submit"
                >
                  Submit Ticket
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">{ticket.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{ticket.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {ticket.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ticket.priority === "High"
                        ? "bg-red-100 text-red-800"
                        : ticket.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ticket.status === "Open"
                        ? "bg-blue-100 text-blue-800"
                        : ticket.status === "In Progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </TableCell>
                <TableCell>{ticket.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
