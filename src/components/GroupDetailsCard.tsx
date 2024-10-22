// components/GroupDetailsCard.tsx
import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

interface GroupDetailsCardProps {
  group: {
    name: string;
    members: string[];
  };
}

export const GroupDetailsCard: React.FC<GroupDetailsCardProps> = ({ group }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{group.name}</CardTitle>
        <CardDescription>{group.members.length} members</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {group.members.map((member, index) => (
            <div
              key={index}
              className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm"
            >
              {member}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
