import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

interface Balances {
  [member: string]: {
    [otherMember: string]: number
  }
}

interface BalanceDisplayProps {
  balances: Balances
  members: string[]
}

export default function BalanceDisplay({ balances, members }: BalanceDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card key={member} className="overflow-hidden">
              <CardHeader className="bg-muted">
                <CardTitle className="text-lg">{member}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {members.filter(otherMember => otherMember !== member).map(otherMember => {
                  const balance = balances[member]?.[otherMember] || 0
                  const isPositive = balance > 0
                  return (
                    <div key={otherMember} className="flex justify-between items-center py-2">
                      <span className="flex items-center">
                        {isPositive ? (
                          <ArrowUpRight className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownLeft className="mr-2 h-4 w-4 text-red-500" />
                        )}
                        {otherMember}
                      </span>
                      <span className={`font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{balance.toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}