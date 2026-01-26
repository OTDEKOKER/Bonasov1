"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, ClipboardList, ChevronRight, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/shared/page-header"
import { mockAssessments, mockIndicators } from "@/lib/mock-data"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const typeLabels: Record<string, string> = {
  yes_no: "Yes/No",
  number: "Number",
  open_text: "Text",
  single_select: "Single Select",
  multiselect: "Multiselect",
  numbers_by_category: "Numbers",
}

export default function AssessmentsPage() {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessments"
        description="Manage assessment forms and their indicators"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Indicators", href: "/indicators" },
          { label: "Assessments" },
        ]}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Button>
        }
      />

      {/* Assessment cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {mockAssessments.map((assessment) => {
          const indicators = mockIndicators.filter(i => i.assessmentId === assessment.id)
          
          return (
            <Card key={assessment.id} className="overflow-hidden">
              <CardHeader className="bg-secondary/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{assessment.name}</CardTitle>
                      <CardDescription>{assessment.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {indicators.length} questions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="indicators" className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <span className="text-sm text-muted-foreground">
                        View Questions
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-2">
                        {indicators.map((indicator, index) => (
                          <div
                            key={indicator.id}
                            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                          >
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {indicator.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {indicator.code}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {typeLabels[indicator.type] || indicator.type}
                              </Badge>
                              {indicator.isRequired && (
                                <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <div className="flex items-center justify-between border-t border-border px-6 py-3">
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(assessment.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/indicators/assessments/${assessment.id}`)}
                  >
                    Edit Assessment
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {mockAssessments.length === 0 && (
          <div className="col-span-2 flex h-40 items-center justify-center rounded-lg border border-dashed border-border">
            <div className="text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">No assessments yet</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 bg-transparent"
                onClick={() => setIsCreateOpen(true)}
              >
                Create your first assessment
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>
              Create a new assessment form to group indicators
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Assessment Name</Label>
              <Input id="name" placeholder="e.g., HIV Testing Assessment" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the assessment"
                rows={3}
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCreateOpen(false)}>
              Create Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
