export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type FoundationTable<Row, RequiredInsert extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, RequiredInsert> & Partial<Omit<Row, RequiredInsert>>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: { id: string; admin_user_id: string | null; admin_email: string; action: string; entity_type: string | null; entity_id: string | null; metadata: Json; created_at: string }
        Insert: { id?: string; admin_user_id?: string | null; admin_email: string; action: string; entity_type?: string | null; entity_id?: string | null; metadata?: Json; created_at?: string }
        Update: { id?: string; admin_user_id?: string | null; admin_email?: string; action?: string; entity_type?: string | null; entity_id?: string | null; metadata?: Json; created_at?: string }
        Relationships: []
      }
      admin_members: {
        Row: { id: string; email: string; email_normalized: string; auth_user_id: string | null; role: string; status: string; invited_by: string | null; created_at: string; updated_at: string; last_login_at: string | null; invitation_issued_at: string | null; invitation_expires_at: string | null; invitation_accepted_at: string | null; invitation_revoked_at: string | null }
        Insert: { id?: string; email: string; email_normalized: string; auth_user_id?: string | null; role?: string; status?: string; invited_by?: string | null; created_at?: string; updated_at?: string; last_login_at?: string | null; invitation_issued_at?: string | null; invitation_expires_at?: string | null; invitation_accepted_at?: string | null; invitation_revoked_at?: string | null }
        Update: { id?: string; email?: string; email_normalized?: string; auth_user_id?: string | null; role?: string; status?: string; invited_by?: string | null; created_at?: string; updated_at?: string; last_login_at?: string | null; invitation_issued_at?: string | null; invitation_expires_at?: string | null; invitation_accepted_at?: string | null; invitation_revoked_at?: string | null }
        Relationships: [{ foreignKeyName: "admin_members_invited_by_fkey"; columns: ["invited_by"]; isOneToOne: false; referencedRelation: "admin_members"; referencedColumns: ["id"] }]
      }
      organizations: FoundationTable<{
        id: string; slug: string; name: string; description: string | null; organization_type: string; status: string; created_at: string; updated_at: string
      }, "slug" | "name">
      organization_memberships: FoundationTable<{
        id: string; organization_id: string; participant_id: string; membership_role: string; status: string; joined_at: string | null; created_at: string; updated_at: string
      }, "organization_id" | "participant_id">
      hubs: FoundationTable<{
        id: string; organization_id: string | null; slug: string; name: string; description: string | null; status: string; membership_mode: string; location: Json; created_at: string; updated_at: string
      }, "slug" | "name">
      hub_memberships: FoundationTable<{
        id: string; hub_id: string; participant_id: string; membership_role: string; status: string; joined_at: string | null; created_at: string; updated_at: string
      }, "hub_id" | "participant_id">
      platform_role_assignments: FoundationTable<{
        id: string; auth_user_id: string; role: string; scope_type: string; scope_id: string | null; status: string; granted_by: string | null; created_at: string; updated_at: string
      }, "auth_user_id" | "role" | "scope_type">
      experiences: FoundationTable<{
        id: string; slug: string; name: string; description: string | null; experience_type: string; delivery_mode: string; status: string; accent_color: string | null; visibility: string; admission_policy: string; created_by: string | null; current_published_version_id: string | null; owner_organization_id: string | null; default_theme_id: string | null; card_configuration: Json; created_at: string; updated_at: string
      }, "slug" | "name" | "experience_type">
      experience_versions: FoundationTable<{
        id: string; experience_id: string; version_label: string; status: string; title: string; description: string | null; published_at: string | null; created_by: string | null; based_on_version_id: string | null; published_by: string | null; release_type: string | null; theme_id: string | null; shell_mode: string; course_configuration: Json; created_at: string; updated_at: string
      }, "experience_id" | "version_label" | "title">
      experience_modules: FoundationTable<{
        id: string; experience_version_id: string; module_key: string; title: string; description: string | null; sort_order: number; is_required: boolean; requirement_level: string; metadata: Json; created_at: string; updated_at: string
      }, "experience_version_id" | "module_key" | "title" | "sort_order">
      experience_lessons: FoundationTable<{
        id: string; module_id: string; experience_version_id: string; lesson_key: string; title: string; description: string | null; sort_order: number; is_required: boolean; requirement_level: string; completion_rule: string; metadata: Json; created_at: string; updated_at: string
      }, "module_id" | "experience_version_id" | "lesson_key" | "title" | "sort_order">
      experience_sections: FoundationTable<{
        id: string; lesson_id: string; module_id: string; experience_version_id: string; section_key: string; title: string; description: string | null; sort_order: number; requirement_level: string; renderer_mode: string; custom_renderer_key: string | null; completion_rule: string; settings: Json; metadata: Json; created_at: string; updated_at: string
      }, "lesson_id" | "module_id" | "experience_version_id" | "section_key" | "title">
      section_layouts: FoundationTable<{
        id: string; section_id: string; layout_mode: string; participant_resizing_enabled: boolean; settings: Json; created_at: string; updated_at: string
      }, "section_id">
      section_columns: FoundationTable<{
        id: string; section_layout_id: string; section_id: string; column_key: string; label: string | null; sort_order: number; width_percent: number; sticky: boolean; collapsible: boolean; default_collapsed: boolean; mobile_order: number; mobile_behavior: string; settings: Json; created_at: string; updated_at: string
      }, "section_layout_id" | "section_id" | "column_key" | "width_percent">
      content_blocks: FoundationTable<{
        id: string; lesson_id: string; section_id: string | null; column_id: string | null; block_key: string; block_type: string; sort_order: number; content: Json; settings: Json; requirement_level: string; status: string; visibility: string; completion_rule: string; custom_renderer_key: string | null; metadata: Json; created_at: string; updated_at: string
      }, "lesson_id" | "block_key" | "block_type" | "sort_order">
      resources: FoundationTable<{
        id: string; title: string; description: string | null; resource_type: string; resource_category: string; status: string; external_url: string | null; storage_bucket: string | null; storage_path: string | null; original_filename: string | null; mime_type: string | null; file_size_bytes: number | null; metadata: Json; created_by: string | null; created_at: string; updated_at: string
      }, "title" | "resource_type">
      content_block_resources: FoundationTable<{
        content_block_id: string; resource_id: string; sort_order: number; created_at: string
      }, "content_block_id" | "resource_id">
      resource_experience_associations: FoundationTable<{
        resource_id: string; experience_id: string; created_by: string | null; created_at: string
      }, "resource_id" | "experience_id">
      companion_modules: FoundationTable<{
        id: string; experience_version_id: string; module_key: string; module_type: string; scope: string; audience: string; availability_context: "individual" | "cohort" | "both"; target_module_id: string | null; target_lesson_id: string | null; target_section_id: string | null; display_title: string; sort_order: number; visibility: string; configuration: Json; created_by: string | null; created_at: string; updated_at: string
      }, "experience_version_id" | "module_type" | "scope" | "audience" | "display_title">
      companion_draft_identity_decisions: FoundationTable<{
        draft_version_id: string; source_companion_module_id: string; decision: string; decided_by: string; decided_at: string
      }, "draft_version_id" | "source_companion_module_id" | "decision" | "decided_by">
      companion_delivery_overrides: FoundationTable<{
        id: string; companion_module_id: string; experience_version_id: string; offering_id: string | null; cohort_course_plan_id: string | null; visibility: string; configuration: Json; updated_by: string | null; created_at: string; updated_at: string
      }, "companion_module_id" | "experience_version_id">
      companion_call_sessions: FoundationTable<{
        id: string; delivery_override_id: string; companion_module_id: string; experience_version_id: string; status: string; started_by_participant_id: string | null; started_by_enrollment_id: string | null; started_by_auth_user_id: string | null; started_at: string; ended_at: string | null; created_at: string; updated_at: string
      }, "delivery_override_id" | "companion_module_id" | "experience_version_id">
      companion_chat_messages: FoundationTable<{
        id: string; delivery_override_id: string; companion_module_id: string; experience_version_id: string; author_participant_id: string; author_enrollment_id: string; body: string; curriculum_context: Json; created_at: string
      }, "delivery_override_id" | "companion_module_id" | "experience_version_id" | "author_participant_id" | "author_enrollment_id" | "body">
      companion_module_resources: FoundationTable<{
        companion_module_id: string; resource_id: string; delivery_override_id: string | null; sort_order: number; created_at: string
      }, "companion_module_id" | "resource_id">
      participant_companion_entries: FoundationTable<{
        id: string; companion_module_id: string; participant_id: string; enrollment_id: string; experience_version_id: string; entry_data: Json; created_at: string; updated_at: string
      }, "companion_module_id" | "participant_id" | "enrollment_id" | "experience_version_id">
      participant_personal_notes: FoundationTable<{
        id: string; enrollment_id: string; participant_id: string; experience_id: string; companion_module_key: string; source_experience_version_id: string | null; source_companion_module_id: string | null; content: string; curriculum_context: Json; created_at: string; updated_at: string
      }, "enrollment_id" | "participant_id" | "experience_id" | "companion_module_key" | "content">
      cohorts: FoundationTable<{
        id: string; experience_id: string; experience_version_id: string | null; organization_id: string | null; hub_id: string | null; name: string; slug: string; status: string; start_date: string | null; end_date: string | null; capacity: number | null; created_at: string; updated_at: string
      }, "experience_id" | "name" | "slug">
      cohort_memberships: FoundationTable<{
        id: string; cohort_id: string; participant_id: string; membership_role: string; status: string; joined_at: string | null; created_at: string; updated_at: string
      }, "cohort_id" | "participant_id">
      experience_enrollments: FoundationTable<{
        id: string; experience_id: string; experience_version_id: string | null; participant_id: string; cohort_id: string | null; offering_id: string | null; source_type: string; source_id: string | null; status: string; version_policy: string; completed_experience_version_id: string | null; enrolled_at: string; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string
      }, "experience_id" | "participant_id">
      experience_enrollment_version_history: FoundationTable<{
        id: string; enrollment_id: string; participant_id: string; experience_id: string; experience_version_id: string; transition_reason: string; artifact_snapshot: Json; started_at: string; ended_at: string | null; created_at: string
      }, "enrollment_id" | "participant_id" | "experience_id" | "experience_version_id" | "transition_reason">
      experience_entitlements: FoundationTable<{
        id: string; participant_id: string; experience_id: string; source_type: string; source_id: string | null; status: string; starts_at: string; expires_at: string | null; granted_by: string | null; created_at: string; updated_at: string
      }, "participant_id" | "experience_id" | "source_type">
      experience_progress: FoundationTable<{
        id: string; enrollment_id: string; participant_id: string; experience_id: string; experience_version_id: string | null; status: string; current_module_id: string | null; current_lesson_id: string | null; current_section_id: string | null; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string
      }, "enrollment_id" | "participant_id" | "experience_id">
      lesson_progress: FoundationTable<{
        id: string; enrollment_id: string; participant_id: string; experience_version_id: string; lesson_id: string; status: string; resume_state: Json; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string
      }, "enrollment_id" | "participant_id" | "experience_version_id" | "lesson_id">
      section_progress: FoundationTable<{
        id: string; enrollment_id: string; participant_id: string; experience_version_id: string; section_id: string; status: string; resume_state: Json; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string
      }, "enrollment_id" | "participant_id" | "experience_version_id" | "section_id">
      experience_themes: FoundationTable<{
        id: string; theme_key: string; revision: number; name: string; organization_id: string | null; status: string; configuration: Json; created_by: string | null; created_at: string; updated_at: string
      }, "theme_key" | "name">
      delivery_plan_templates: FoundationTable<{
        id: string; experience_id: string; experience_version_id: string; name: string; description: string | null; sharing_scope: string; organization_id: string | null; hub_id: string | null; status: string; settings: Json; created_by: string | null; created_at: string; updated_at: string
      }, "experience_id" | "experience_version_id" | "name">
      delivery_plan_template_modules: FoundationTable<{
        id: string; template_id: string; experience_version_id: string; source_module_id: string; sort_order: number; display_title: string | null; visibility: string; settings: Json; created_at: string; updated_at: string
      }, "template_id" | "experience_version_id" | "source_module_id">
      delivery_plan_template_sections: FoundationTable<{
        id: string; template_id: string; template_module_id: string; experience_version_id: string; source_section_id: string; sort_order: number; visibility: string; display_title: string | null; release_at: string | null; settings: Json; created_at: string; updated_at: string
      }, "template_id" | "template_module_id" | "experience_version_id" | "source_section_id">
      cohort_course_plans: FoundationTable<{
        id: string; cohort_id: string; experience_id: string; experience_version_id: string; based_on_template_id: string | null; name: string | null; status: string; group_mode_override: string | null; settings: Json; created_by: string | null; created_at: string; updated_at: string
      }, "cohort_id" | "experience_id" | "experience_version_id">
      cohort_course_plan_modules: FoundationTable<{
        id: string; plan_id: string; experience_version_id: string; source_module_id: string; sort_order: number; display_title: string | null; visibility: string; settings: Json; created_at: string; updated_at: string
      }, "plan_id" | "experience_version_id" | "source_module_id">
      cohort_course_plan_sections: FoundationTable<{
        id: string; plan_id: string; plan_module_id: string; experience_version_id: string; occurrence_type: string; source_section_id: string | null; sort_order: number; visibility: string; display_title: string | null; release_at: string | null; settings: Json; created_at: string; updated_at: string
      }, "plan_id" | "plan_module_id" | "experience_version_id">
      response_definitions: FoundationTable<{
        id: string; lesson_id: string; experience_version_id: string; block_id: string | null; response_key: string; response_type: string; label: string; instructions: string | null; is_required: boolean; configuration: Json; raw_visibility: string; result_visibility: string; share_mode: string; visibility_settings: Json; created_at: string; updated_at: string
      }, "lesson_id" | "experience_version_id" | "response_key" | "response_type" | "label">
      participant_responses: FoundationTable<{
        id: string; participant_id: string; enrollment_id: string; experience_version_id: string; response_definition_id: string; response_data: Json; status: string; finalized_at: string | null; created_at: string; updated_at: string
      }, "participant_id" | "enrollment_id" | "experience_version_id" | "response_definition_id">
      tags: FoundationTable<{
        id: string; slug: string; name: string; description: string | null; category: string; status: string; created_at: string; updated_at: string
      }, "slug" | "name">
      participant_tags: FoundationTable<{
        participant_id: string; tag_id: string; assigned_by: string | null; created_at: string
      }, "participant_id" | "tag_id">
      participant_preferences: FoundationTable<{
        participant_id: string; default_hub_id: string | null; created_at: string; updated_at: string
      }, "participant_id">
      experience_offerings: FoundationTable<{
        id: string; experience_id: string; experience_version_id: string | null; hub_id: string | null; cohort_id: string | null; name: string; slug: string; status: string; visibility: string; access_mode: string; admission_policy: string | null; is_default: boolean; starts_at: string | null; ends_at: string | null; settings: Json; created_by: string | null; group_mode: string; default_delivery_plan_template_id: string | null; created_at: string; updated_at: string
      }, "experience_id" | "name" | "slug">
      participant_offering_assignments: FoundationTable<{
        id: string; participant_id: string; offering_id: string; source_type: string; source_id: string | null; status: string; starts_at: string; expires_at: string | null; assigned_by: string | null; created_at: string; updated_at: string
      }, "participant_id" | "offering_id">
      crm_notes: FoundationTable<{
        id: string; participant_id: string | null; organization_id: string | null; hub_id: string | null; body: string; visibility: string; created_by: string | null; created_at: string; updated_at: string
      }, "body">
      crm_imports: FoundationTable<{
        id: string; import_type: string; file_name: string; status: string; column_mapping: Json; row_count: number; result_summary: Json; created_by: string; confirmed_at: string | null; completed_at: string | null; created_at: string; updated_at: string
      }, "file_name" | "column_mapping" | "row_count" | "created_by">
      crm_import_rows: FoundationTable<{
        id: string; import_id: string; row_number: number; source_data: Json; first_name: string | null; last_name: string | null; email: string | null; email_normalized: string | null; classification: string; existing_participant_id: string | null; issue: string | null; selected: boolean; outcome: string; created_participant_id: string | null; error_detail: string | null; created_at: string; updated_at: string
      }, "import_id" | "row_number" | "source_data" | "classification">
      lmu_assessments: {
        Row: {
          assessment_version: string
          completed_at: string | null
          created_at: string
          current_module: string | null
          experience_type: string
          id: string
          participant_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          assessment_version?: string
          completed_at?: string | null
          created_at?: string
          current_module?: string | null
          experience_type?: string
          id?: string
          participant_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_version?: string
          completed_at?: string | null
          created_at?: string
          current_module?: string | null
          experience_type?: string
          id?: string
          participant_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lmu_assessments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      lmu_responses: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          response_data: Json
          schema_version: string
          section_key: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          response_data?: Json
          schema_version?: string
          section_key: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          response_data?: Json
          schema_version?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lmu_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "lmu_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      lmu_results: {
        Row: {
          assessment_id: string
          finalized_at: string
          id: string
          result_data: Json
          schema_version: string
          section_key: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          finalized_at?: string
          id?: string
          result_data?: Json
          schema_version?: string
          section_key: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          finalized_at?: string
          id?: string
          result_data?: Json
          schema_version?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lmu_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "lmu_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      lmu_section_progress: {
        Row: {
          assessment_id: string
          completed_at: string | null
          current_step: string | null
          id: string
          section_key: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          current_step?: string | null
          id?: string
          section_key: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          current_step?: string | null
          id?: string
          section_key?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lmu_section_progress_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "lmu_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_sessions: {
        Row: {
          assessment_id: string
          created_at: string
          expires_at: string
          id: string
          last_seen_at: string
          participant_id: string
          token_hash: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          expires_at: string
          id?: string
          last_seen_at?: string
          participant_id: string
          token_hash: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          participant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_sessions_assessment_id_participant_id_fkey"
            columns: ["assessment_id", "participant_id"]
            isOneToOne: false
            referencedRelation: "lmu_assessments"
            referencedColumns: ["id", "participant_id"]
          },
          {
            foreignKeyName: "participant_sessions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          email_normalized: string
          first_name: string
          full_name: string | null
          preferred_name: string | null
          phone: string | null
          city: string | null
          state_region: string | null
          country: string | null
          timezone: string | null
          short_bio: string | null
          id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          email_normalized: string
          first_name: string
          full_name?: string | null
          preferred_name?: string | null
          phone?: string | null
          city?: string | null
          state_region?: string | null
          country?: string | null
          timezone?: string | null
          short_bio?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          email_normalized?: string
          first_name?: string
          full_name?: string | null
          preferred_name?: string | null
          phone?: string | null
          city?: string | null
          state_region?: string | null
          country?: string | null
          timezone?: string | null
          short_bio?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_admin_invitation: {
        Args: { p_auth_user_id: string; p_email: string; p_now?: string }
        Returns: { member_id: string; activated_role: string }[]
      }
      move_draft_experience_lesson: {
        Args: { p_experience_id: string; p_experience_version_id: string; p_lesson_id: string; p_target_module_id: string; p_position?: number }
        Returns: undefined
      }
      publish_experience_version: {
        Args: { p_experience_id: string; p_version_id: string; p_actor_id: string }
        Returns: string
      }
      clone_experience_version: {
        Args: { p_experience_id: string; p_source_version_id: string; p_version_label: string; p_actor_id: string }
        Returns: string
      }
      clone_experience_version_with_companion_keys: {
        Args: { p_experience_id: string; p_source_version_id: string; p_version_label: string; p_actor_id: string }
        Returns: string
      }
      reconcile_draft_companion_module_key: {
        Args: { p_draft_companion_module_id: string; p_source_companion_module_id: string }
        Returns: undefined
      }
      acknowledge_draft_companion_module_removal: {
        Args: { p_draft_version_id: string; p_source_companion_module_id: string; p_actor_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
