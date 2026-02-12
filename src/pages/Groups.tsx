import { useState } from "react";
import React from "react";
import { motion } from "framer-motion";
import { Plus, Users, Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar.tsx";
import { groups, type Group } from "../data/groups.ts";
import CreateGroupModal from "../components/groups/CreateGroupModal";

const Groups = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-[72px]">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                Your Groups
              </h1>
              <p className="text-muted-foreground">
                Plan events together with friends and colleagues
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Group</span>
            </button>
          </motion.div>

          {/* Groups Grid */}
          {groups.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {groups.map((group, index) => (
                <GroupCard key={group.id} group={group} index={index} />
              ))}
            </motion.div>
          ) : (
            <EmptyGroupsState onCreateGroup={() => setShowCreateModal(true)} />
          )}
        </div>
      </main>

      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

interface GroupCardProps {
  group: Group;
  index: number;
}

const GroupCard = ({ group, index }: GroupCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link to={`/groups/${group.id}`} className="card-group block group">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
            style={{ backgroundColor: `${group.color}20`, color: group.color }}
          >
            {group.emoji}
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        <h3 className="font-heading font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
          {group.name}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {group.description}
        </p>

        <div className="flex items-center justify-between">
          {/* Members */}
          <div className="flex items-center gap-2">
            <div className="avatar-group">
              {group.members.slice(0, 4).map((member) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium"
                  title={member.name}
                >
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    member.name.charAt(0)
                  )}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {group.members.length} members
            </span>
          </div>

          {/* Upcoming events */}
          {group.suggestedEvents.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-accent">
              <Calendar className="w-4 h-4" />
              <span>{group.suggestedEvents.length} suggested</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

interface EmptyGroupsStateProps {
  onCreateGroup: () => void;
}

const EmptyGroupsState = ({ onCreateGroup }: EmptyGroupsStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-20"
    >
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
        <Users className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
        No groups yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Create a group to start planning events with friends, family, or colleagues
      </p>
      <button onClick={onCreateGroup} className="btn-primary">
        Create Your First Group
      </button>
    </motion.div>
  );
};

export default Groups;