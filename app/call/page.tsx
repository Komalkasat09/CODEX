"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Video, Mic, MessageSquare, Settings, Users } from "lucide-react"

export default function CallPage() {
  return (
    <div className="min-h-screen p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Main Call Interface */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold">Video Call Translation</h1>
                <p className="text-muted-foreground">Connect and communicate with real-time sign language translation</p>
              </div>
              <Button variant="outline" className="gap-2">
                <Users className="w-4 h-4" />
                Join Meeting
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Calls */}
              <Card className="p-4 col-span-1">
                <h2 className="text-lg font-semibold mb-4">Recent Connections</h2>
                <div className="space-y-4">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-accent rounded-lg cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium">Meeting {i + 1}</div>
                          <div className="text-sm text-muted-foreground">2 participants</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Video Preview */}
              <Card className="col-span-2 aspect-video relative overflow-hidden bg-accent">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-16 h-16 text-muted-foreground" />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <Button size="icon" variant="secondary">
                    <Mic className="w-4 h-4" />
                  </Button>
                  <Button size="icon" className="bg-primary hover:bg-primary/90">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary">
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}