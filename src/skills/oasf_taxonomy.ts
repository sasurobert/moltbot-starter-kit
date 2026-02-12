/**
 * OASF (Open Agent Skill Framework) Taxonomy v0.8.0
 * Source: https://github.com/multiversx/mx-8004-explorer/blob/main/src/data/mock/oasf-taxonomy.ts
 *
 * Used by the Explorer to validate agent skill/domain declarations during registration.
 */

export const OASF_SCHEMA_VERSION = '0.8.0';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OASFSkillGroup {
  category: string;
  items: string[];
}

export interface OASFDomainGroup {
  category: string;
  items: string[];
}

export interface OASFManifest {
  schemaVersion: string;
  skills: OASFSkillGroup[];
  domains: OASFDomainGroup[];
}

// ─── Skills — 12 categories, 136 items ─────────────────────────────────────────

export const OASF_SKILLS: OASFSkillGroup[] = [
  {
    category: 'Retrieval Augmented Generation',
    items: [
      'search',
      'semantic_search',
      'document_retrieval',
      'knowledge_graph_query',
      'vector_lookup',
      'hybrid_search',
      'entity_extraction',
      'passage_ranking',
      'index_management',
      'citation_linking',
      'faceted_search',
    ],
  },
  {
    category: 'Tool Interaction',
    items: [
      'api_call',
      'function_execution',
      'browser_automation',
      'code_execution',
      'shell_command',
      'database_query',
      'file_system_access',
      'webhook_dispatch',
      'plugin_invocation',
      'schema_validation',
      'rate_limit_handling',
      'retry_orchestration',
    ],
  },
  {
    category: 'Natural Language Processing',
    items: [
      'text_generation',
      'summarization',
      'translation',
      'sentiment_analysis',
      'named_entity_recognition',
      'topic_classification',
      'question_answering',
      'paraphrasing',
      'text_completion',
      'language_detection',
      'keyword_extraction',
      'intent_recognition',
    ],
  },
  {
    category: 'Code Generation',
    items: [
      'code_writing',
      'code_review',
      'debugging',
      'refactoring',
      'test_generation',
      'documentation_generation',
      'code_explanation',
      'dependency_analysis',
      'type_inference',
      'linting',
      'migration_scripting',
    ],
  },
  {
    category: 'Data Analysis',
    items: [
      'data_extraction',
      'statistical_analysis',
      'visualization',
      'reporting',
      'anomaly_detection',
      'trend_forecasting',
      'data_cleaning',
      'feature_engineering',
      'correlation_analysis',
      'pivot_aggregation',
      'regression_modeling',
      'clustering',
    ],
  },
  {
    category: 'Blockchain Operations',
    items: [
      'transaction_signing',
      'smart_contract_interaction',
      'token_transfer',
      'nft_minting',
      'wallet_management',
      'gas_estimation',
      'event_monitoring',
      'block_scanning',
      'staking_delegation',
      'governance_voting',
      'multisig_coordination',
      'cross_chain_bridging',
    ],
  },
  {
    category: 'Image Processing',
    items: [
      'image_generation',
      'image_editing',
      'ocr',
      'image_classification',
      'object_detection',
      'face_recognition',
      'style_transfer',
      'background_removal',
      'image_upscaling',
      'diagram_rendering',
      'screenshot_analysis',
    ],
  },
  {
    category: 'Communication',
    items: [
      'email_sending',
      'messaging',
      'notification',
      'webhook',
      'calendar_scheduling',
      'sms_dispatch',
      'voice_call',
      'push_notification',
      'channel_broadcast',
      'template_rendering',
      'delivery_tracking',
    ],
  },
  {
    category: 'Security',
    items: [
      'vulnerability_scanning',
      'audit',
      'encryption',
      'access_control',
      'secret_management',
      'certificate_validation',
      'token_rotation',
      'intrusion_detection',
      'policy_enforcement',
      'input_sanitization',
      'threat_modeling',
    ],
  },
  {
    category: 'Planning & Reasoning',
    items: [
      'task_decomposition',
      'multi_step_planning',
      'goal_setting',
      'constraint_satisfaction',
      'priority_ranking',
      'decision_tree_traversal',
      'hypothesis_testing',
      'trade_off_analysis',
      'causal_reasoning',
      'backtracking',
      'resource_allocation',
    ],
  },
  {
    category: 'Memory & State',
    items: [
      'context_management',
      'long_term_memory',
      'session_state',
      'knowledge_base',
      'conversation_history',
      'embedding_storage',
      'cache_management',
      'state_persistence',
      'rollback_recovery',
      'snapshot_versioning',
    ],
  },
  {
    category: 'Multi-Agent',
    items: [
      'delegation',
      'coordination',
      'negotiation',
      'consensus',
      'task_routing',
      'load_balancing',
      'result_aggregation',
      'conflict_resolution',
      'agent_discovery',
      'capability_matching',
      'swarm_orchestration',
      'feedback_propagation',
    ],
  },
];

// ─── Domains — 16 categories, 204 items ────────────────────────────────────────

export const OASF_DOMAINS: OASFDomainGroup[] = [
  {
    category: 'Finance & Business',
    items: [
      'trading',
      'defi',
      'lending',
      'insurance',
      'accounting',
      'portfolio_management',
      'risk_assessment',
      'fraud_detection',
      'payment_processing',
      'tax_preparation',
      'financial_reporting',
      'credit_scoring',
      'invoice_management',
      'budget_forecasting',
    ],
  },
  {
    category: 'Healthcare',
    items: [
      'diagnostics',
      'drug_discovery',
      'patient_monitoring',
      'medical_imaging',
      'clinical_trials',
      'health_records',
      'telemedicine',
      'symptom_analysis',
      'treatment_planning',
      'pharmacovigilance',
      'genomics',
      'mental_health',
      'appointment_scheduling',
    ],
  },
  {
    category: 'Legal',
    items: [
      'contract_analysis',
      'compliance',
      'due_diligence',
      'legal_research',
      'patent_search',
      'regulatory_filing',
      'dispute_resolution',
      'risk_assessment',
      'document_review',
      'case_management',
      'intellectual_property',
      'privacy_assessment',
      'license_management',
    ],
  },
  {
    category: 'Education',
    items: [
      'tutoring',
      'curriculum_design',
      'assessment',
      'adaptive_learning',
      'content_creation',
      'student_analytics',
      'language_instruction',
      'exam_generation',
      'plagiarism_detection',
      'skill_mapping',
      'mentorship_matching',
      'accreditation',
    ],
  },
  {
    category: 'Creative Arts',
    items: [
      'music_composition',
      'visual_design',
      'creative_writing',
      'video_production',
      'animation',
      'typography',
      'sound_design',
      'color_grading',
      'storyboarding',
      'brand_identity',
      'photography',
      'illustration',
      'art_curation',
    ],
  },
  {
    category: 'Engineering',
    items: [
      'cad_design',
      'simulation',
      'testing',
      'structural_analysis',
      'materials_selection',
      'prototyping',
      'tolerance_analysis',
      'thermal_modeling',
      'fluid_dynamics',
      'failure_analysis',
      'quality_assurance',
      'standards_compliance',
      'manufacturing_planning',
    ],
  },
  {
    category: 'Research',
    items: [
      'literature_review',
      'hypothesis_generation',
      'experiment_design',
      'data_collection',
      'peer_review',
      'citation_analysis',
      'meta_analysis',
      'reproducibility_check',
      'grant_writing',
      'statistical_validation',
      'survey_design',
      'systematic_review',
    ],
  },
  {
    category: 'DevOps',
    items: [
      'deployment',
      'monitoring',
      'incident_response',
      'ci_cd_pipeline',
      'infrastructure_provisioning',
      'log_aggregation',
      'alerting',
      'capacity_planning',
      'container_orchestration',
      'configuration_management',
      'rollback_automation',
      'service_mesh',
      'chaos_engineering',
    ],
  },
  {
    category: 'Marketing',
    items: [
      'content_creation',
      'seo',
      'analytics',
      'campaign_management',
      'social_media',
      'email_marketing',
      'ab_testing',
      'audience_segmentation',
      'brand_monitoring',
      'lead_scoring',
      'conversion_optimization',
      'influencer_outreach',
      'market_research',
    ],
  },
  {
    category: 'Customer Support',
    items: [
      'ticket_routing',
      'knowledge_base',
      'chatbot',
      'sentiment_tracking',
      'escalation_management',
      'response_templating',
      'satisfaction_survey',
      'issue_categorization',
      'sla_monitoring',
      'feedback_analysis',
      'self_service_portal',
      'multilingual_support',
    ],
  },
  {
    category: 'Supply Chain',
    items: [
      'logistics',
      'inventory',
      'procurement',
      'demand_forecasting',
      'warehouse_management',
      'route_optimization',
      'supplier_evaluation',
      'order_tracking',
      'quality_inspection',
      'returns_processing',
      'customs_clearance',
      'fleet_management',
    ],
  },
  {
    category: 'Real Estate',
    items: [
      'valuation',
      'market_analysis',
      'property_management',
      'lease_administration',
      'mortgage_processing',
      'zoning_compliance',
      'tenant_screening',
      'maintenance_scheduling',
      'investment_analysis',
      'title_search',
      'comparative_analysis',
      'occupancy_optimization',
      'document_generation',
    ],
  },
  {
    category: 'Agriculture',
    items: [
      'crop_monitoring',
      'yield_prediction',
      'soil_analysis',
      'irrigation_scheduling',
      'pest_detection',
      'weather_integration',
      'harvest_planning',
      'livestock_tracking',
      'fertilizer_optimization',
      'supply_chain_tracing',
      'precision_farming',
      'market_price_tracking',
      'sustainability_scoring',
    ],
  },
  {
    category: 'Energy',
    items: [
      'grid_optimization',
      'demand_forecasting',
      'renewable_integration',
      'load_balancing',
      'emissions_monitoring',
      'battery_management',
      'smart_metering',
      'outage_prediction',
      'energy_trading',
      'carbon_accounting',
      'asset_inspection',
      'regulatory_reporting',
    ],
  },
  {
    category: 'Gaming',
    items: [
      'npc_behavior',
      'procedural_generation',
      'game_testing',
      'matchmaking',
      'difficulty_scaling',
      'narrative_branching',
      'physics_simulation',
      'economy_balancing',
      'anti_cheat',
      'player_analytics',
      'content_moderation',
      'level_design',
    ],
  },
  {
    category: 'Cybersecurity',
    items: [
      'threat_detection',
      'penetration_testing',
      'forensics',
      'malware_analysis',
      'network_monitoring',
      'vulnerability_assessment',
      'incident_response',
      'phishing_detection',
      'access_review',
      'compliance_auditing',
      'log_analysis',
      'security_training',
      'zero_trust_enforcement',
      'data_loss_prevention',
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function getSkillCategory(skillId: string): string | undefined {
  const group = OASF_SKILLS.find(g => g.items.includes(skillId));
  return group?.category;
}

export function getDomainCategory(domainId: string): string | undefined {
  const group = OASF_DOMAINS.find(g => g.items.includes(domainId));
  return group?.category;
}

export function getAllSkillIds(): string[] {
  return OASF_SKILLS.flatMap(g => g.items);
}

export function getAllDomainIds(): string[] {
  return OASF_DOMAINS.flatMap(g => g.items);
}

export function validateOASF(manifest: OASFManifest): string[] {
  const errors: string[] = [];
  const validSkills = getAllSkillIds();
  const validDomains = getAllDomainIds();

  for (const group of manifest.skills) {
    for (const item of group.items) {
      if (!validSkills.includes(item)) {
        errors.push(`Unknown skill: "${item}" in category "${group.category}"`);
      }
    }
  }
  for (const group of manifest.domains) {
    for (const item of group.items) {
      if (!validDomains.includes(item)) {
        errors.push(
          `Unknown domain: "${item}" in category "${group.category}"`,
        );
      }
    }
  }
  return errors;
}
