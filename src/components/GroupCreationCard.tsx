// components/GroupCreationCard.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

interface GroupCreationCardProps {
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  newMember: string;
  setNewMember: (name: string) => void;
  members: string[];
  addMember: () => void;
  removeMember: (member: string) => void;
  createGroup: () => void;
}

export const GroupCreationCard: React.FC<GroupCreationCardProps> = ({
  newGroupName,
  setNewGroupName,
  newMember,
  setNewMember,
  members,
  addMember,
  removeMember,
  createGroup,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Group</CardTitle>
        <CardDescription>Create a new group and add members</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Input
            placeholder="Group name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          <div className="flex space-x-2">
            <Input
              placeholder="Add member"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
            />
            <Button onClick={addMember}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {members.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm"
                >
                  {member}
                  <button
                    onClick={() => removeMember(member)}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={createGroup}
          disabled={!newGroupName || members.length === 0}
        >
          Create Group
        </Button>
      </CardFooter>
    </Card>
  );
};
