"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { motion } from "framer-motion"
import { MessageSquare, Star } from "lucide-react"
import { useState } from "react"

export default function Feedback() {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)

  return (
    <section id="feedback" className="py-20 bg-gradient-to-b from-white to-[#F9FAFB]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FF6B35]/10 rounded-full mb-6">
            <MessageSquare className="w-8 h-8 text-[#FF6B35]" />
          </div>
          <h2 className="font-display text-4xl font-bold text-[#2D3E50] mb-4">We Value Your Feedback</h2>
          <p className="font-body text-lg text-foreground/60">Help us improve Properly by sharing your experience</p>
        </motion.div>

        {/* Feedback Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-8 md:p-10 border-0 shadow-xl bg-white">
            <form className="space-y-6">
              {/* Rating */}
              <div className="text-center">
                <label className="font-display block text-lg font-semibold text-[#2D3E50] mb-4">
                  How would you rate your experience?
                </label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= (hoveredRating || rating)
                            ? "fill-[#FF6B35] text-[#FF6B35]"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="font-body block text-sm font-medium text-[#2D3E50] mb-2">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="font-body w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="font-body block text-sm font-medium text-[#2D3E50] mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="font-body w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all"
                />
              </div>

              {/* Feedback Message */}
              <div>
                <label className="font-body block text-sm font-medium text-[#2D3E50] mb-2">
                  Your Feedback
                </label>
                <textarea
                  rows={5}
                  placeholder="Tell us what you think about Properly..."
                  className="font-body w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  className="font-medium bg-[#FF6B35] hover:bg-[#e55a23] text-white px-10 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  Submit Feedback
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>

        {/* Trust Message */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-body text-center text-sm text-foreground/50 mt-6"
        >
          Your feedback helps us serve you better. We read every message.
        </motion.p>
      </div>
    </section>
  )
}