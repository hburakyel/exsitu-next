import { useState } from "react"
import type { MuseumObject } from "../types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ObjectGridProps {
  objects: MuseumObject[]
  pageSize?: number
}

export default function ObjectGrid({ objects, pageSize = 12 }: ObjectGridProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(objects.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const visibleObjects = objects.slice(startIndex, startIndex + pageSize)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleObjects.map((object) => (
          <Card key={object.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-square relative">
                <img
                  src={object.img_url || "/placeholder.svg"}
                  alt={object.title}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-medium line-clamp-2">{object.title}</h3>
                <p className="text-sm text-muted-foreground">{object.inventory_number}</p>
                <p className="text-sm text-muted-foreground">{object.institution.name}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

