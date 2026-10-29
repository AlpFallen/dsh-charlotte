/**
 * Functional taxonomy and the evidence-based classifier.
 *
 * The category **labels** are a product decision (they are the navigation the
 * user asked for, including the five named ones). Which skill lands in which
 * category is *not* hardcoded: every assignment is computed here from the
 * skill's own real fields — name, description, `whenToUse`, derived keywords
 * and body headings — and the winning terms are returned as evidence, so the
 * detail panel can say why a skill is where it is.
 *
 * There is deliberately no "other" bucket. A skill with no matching term is
 * reported with `confidence: 'weak'` and the least specific category, and the
 * index test asserts the real catalog never produces a weak assignment.
 */

/**
 * Ordered category table. Order is the deterministic tie-break.
 * `terms` are matched case-insensitively; CJK terms match as substrings.
 */
export const CATEGORIES = [

    {
        id: 'quality',
        label: '代码质量',
        labelEn: 'Code Quality',
        terms: [
            '审查', '评审', '测试', '质量', '缺陷', '诊断', '排查', '性能', '规范', '简化', '复杂度',
            '过度工程', '技术债', '审计', '护栏', '预提交', '安全', '漏洞', '回归', '修复', '错误',
            '失败', '卡顿', '缓慢', '重构建议',
            'review', 'test', 'testing', 'quality', 'bug', 'debug', 'diagnose', 'performance',
            'lint', 'standards', 'simplify', 'complexity', 'over-engineering', 'debt', 'audit',
            'guardrail', 'pre-commit', 'security', 'vulnerability', 'regression', 'troubleshoot',
            'fix', 'error', 'failing', 'slow', 'code review', 'yagni',
        ],
    },

    {
        id: 'dev',
        label: '开发工作',
        labelEn: 'Development',
        terms: [
            '实现', '编写', '写代码', '代码', '编程', '重构', '开发', '构建', '功能', '脚手架', '原型',
            '迁移', '依赖', '部署', '脚本', '自动化', '提交', '分支', '接口', '测试驱动',
            'implement', 'refactor', 'coding', 'code', 'build', 'develop', 'feature', 'scaffold',
            'prototype', 'tdd', 'test-driven', 'migrate', 'migration', 'dependency', 'dependencies',
            'deploy', 'script', 'automation', 'api', 'backend', 'cli',
        ],
    },

    {
        id: 'understanding',
        label: '项目理解',
        labelEn: 'Project Understanding',
        terms: [
            '理解', '读懂', '项目结构', '代码库', '架构', '模块', '领域模型', '术语', '词汇', '记录决策',
            '调研', '调查', '现状', '梳理', '盘点', '依赖关系', '路由', '导航', '目录',
            'codebase', 'architecture', 'module', 'seam', 'domain model', 'domain', 'glossary',
            'adr', 'research', 'survey', 'inventory', 'structure', 'router', 'routing', 'map',
        ],
    },

    {
        id: 'docs',
        label: '文档与知识',
        labelEn: 'Docs & Knowledge',
        terms: [
            '文档', '写作', '写文档', '说明', '指南', '手册', '知识', '笔记', '报告', '规格', '需求',
            '方案', '设计文档', '白皮书', '翻译', '总结', '提炼', '归档', '摘录', '课程笔记', 'markdown',
            'documentation', 'docs', 'readme', 'guide', 'handbook', 'knowledge', 'notes', 'report',
            'prd', 'spec', 'writing', 'translate', 'summary', 'summarize', 'archive', 'excerpt',
            'pr 正文', 'pull request', 'pr description',
        ],
    },

    {
        id: 'office',
        label: '办公文档',
        labelEn: 'Office Documents',
        terms: [
            '表格', '工作簿', '公式', '单元格', '演示文稿', '幻灯片', '数据表', '批量处理', '转换',
            'excel', 'xlsx', 'spreadsheet', 'word', 'docx', 'powerpoint', 'pptx', 'slides',
            'pdf', 'convert', 'formula', 'workbook', 'cell', 'csv', 'libreoffice', 'office',
        ],
    },

    {
        id: 'collab',
        label: '任务协作',
        labelEn: 'Task Collaboration',
        terms: [
            '计划', '规划', '任务', '协作', '交接', '委派', '子代理', '工作流', '会话', '提问', '追问',
            '盘问', '决策', '会议', '协调', '排期', '优先级', '复盘', '提醒', '队列', '讨论', '头脑风暴',
            'plan', 'task', 'collaboration', 'handoff', 'delegate', 'subagent', 'workflow', 'session',
            'grill', 'decision', 'meeting', 'coordinate', 'priority', 'retro', 'reminder', 'queue',
            'brainstorm', 'triage', 'planning', '澄清', '重新表述', '没说清楚', '停一下', 'clarify',
            'rephrase', 'restate', 'misunderstood',
        ],
    },

    {
        id: 'design',
        label: '设计与创作',
        labelEn: 'Design & Creation',
        terms: [
            '设计', '视觉', '界面', '前端', '网页', '页面', '品牌', '美术', '排版', '字体', '颜色', '配色',
            '建模', '网格', '渲染', '材质', '纹理', '动画', '骨骼', '相机', '灯光', '场景', '模型', '贴图',
            '雕刻', '吉祥物', '徽标', '视觉稿', '三视图',
            'design', 'visual', 'ui', 'ux', 'frontend', 'website', 'page', 'brand', 'art',
            'typography', 'font', 'color', 'palette', '3d', 'modeling', 'mesh', 'render', 'material',
            'texture', 'uv', 'animation', 'rig', 'camera', 'lighting', 'scene', 'blender', 'sculpt',
            'mascot', 'logo', 'hud', 'wireframe', 'glb', 'gltf',
        ],
    },

    {
        id: 'mail',
        label: '邮件沟通',
        labelEn: 'Mail & Communication',
        terms: [
            '邮件', '收件箱', '发信', '回信', '附件', '转发', '回复', '订阅', '通讯录', '写信',
            'email', 'mail', 'inbox', 'attachment', 'forward', 'reply', 'newsletter', 'agently',
        ],
    },

    {
        id: 'learning',
        label: '学习教练',
        labelEn: 'Learning & Coaching',
        terms: [
            '学习', '教学', '课程', '上课', '导师', '教练', '训练', '练习', '讲解', '入门', '进阶',
            '备考', '考试', '学员', '学校', '带学', '上一课',
            'learn', 'teach', 'course', 'lesson', 'tutor', 'coach', 'training', 'practice',
            'explain', 'beginner', 'student', 'school', 'curriculum',
        ],
    },
];

/** Category ids in display order. */
export const CATEGORY_IDS = CATEGORIES.map(category => category.id);

/** Field weights for the classifier. */
const FIELD_WEIGHTS = {
    name: 6,
    whenToUse: 4,
    description: 2,
    purpose: 2,
    keywords: 2,
    body: 1,
};

/** Longest term length, used to bound substring scanning. */
const MAX_TERM_LENGTH = Math.max(...CATEGORIES.flatMap(category => category.terms.map(term => term.length)));

/**
 * Escape one literal for use inside a regular expression.
 * @param text - literal.
 * @returns escaped literal.
 */
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Precompiled matchers per category and term. */
const MATCHERS = CATEGORIES.map(category => ({
    id: category.id,
    terms: category.terms.map(term => ({
        term,
        // Latin terms need word boundaries so "art" does not match "article";
        // CJK has no word boundaries, so substring matching is correct there.
        regex: /^[a-z0-9][a-z0-9 ._-]*$/i.test(term)
            ? new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`, 'i')
            : undefined,
    })),
}));

/**
 * Test one term against a field value.
 * @param matcher - term matcher.
 * @param value - lowercase field text.
 * @returns whether the term matches.
 */
function termMatches(matcher, value) {
    if (value.length === 0) return false;
    if (matcher.regex !== undefined) return matcher.regex.test(value);
    return value.includes(matcher.term);
}

/**
 * Classify one skill into the functional taxonomy.
 * @param skill - `{ name, description, whenToUse, purpose, keywords, body }`.
 * @returns `{ id, label, labelEn, score, confidence, evidence }`.
 */
export function classifySkill(skill) {
    const provider = String(skill.provider ?? '').toLowerCase();
    const fields = {
        name: String(skill.name ?? '').toLowerCase(),
        whenToUse: String(skill.whenToUse ?? '').toLowerCase(),
        description: String(skill.description ?? '').toLowerCase(),
        purpose: String(skill.purpose ?? '').toLowerCase(),
        keywords: Array.isArray(skill.keywords) ? skill.keywords.join(' ').toLowerCase() : '',
        body: String(skill.body ?? '').slice(0, 4000).toLowerCase(),
    };
    // The name is the strongest, least noisy signal: when a category term
    // literally occurs in the skill's own name, only those categories compete
    // for the assignment. Descriptions and bodies then decide between them,
    // which stops body prose from overriding an explicit name like
    // "code-review" or "office-render".
    const nameMatches = new Set();
    for (const category of MATCHERS) {
        if (category.terms.some(matcher => termMatches(matcher, fields.name))) nameMatches.add(category.id);
    }
    // Package identity is a real signal too: a skill shipped by `dsh-office`
    // or `dsh-blender` belongs to that package's domain unless its own text
    // says otherwise. The prior only nudges near-ties; it is not a mapping
    // table and it is never the sole reason for an assignment.
    const providerPrior = new Set();
    if (provider.length > 0) {
        for (const category of CATEGORIES) {
            if (category.terms.some(term => provider.includes(term.toLowerCase()))) providerPrior.add(category.id);
        }
    }
    const strict = nameMatches.size > 0;
    if (strict) for (const id of providerPrior) nameMatches.add(id);
    let best = { id: 'collab', score: 0, evidence: [] };
    for (const category of MATCHERS) {
        if (strict && !nameMatches.has(category.id)) continue;
        let score = 0;
        const evidence = [];
        for (const matcher of category.terms) {
            for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
                // A name-anchored decision ignores the body: long prose is the
                // noisiest field and must not outvote the skill's own name.
                if (strict && field === 'body') continue;
                if (!termMatches(matcher, fields[field])) continue;
                score += weight;
                const already = evidence.find(row => row.term === matcher.term);
                if (already === undefined) evidence.push({ term: matcher.term, fields: [field], weight });
                else {
                    already.fields.push(field);
                    already.weight += weight;
                }
            }
        }
        if (providerPrior.has(category.id)) score += 6;
        if (score > best.score) {
            best = { id: category.id, score, evidence };
        }
    }
    const category = CATEGORIES.find(row => row.id === best.id) ?? CATEGORIES[4];
    const confidence = best.score >= 10 ? 'high' : best.score >= 5 ? 'medium' : best.score > 0 ? 'low' : 'weak';
    const evidence = best.evidence
        .sort((left, right) => right.weight - left.weight || left.term.localeCompare(right.term))
        .slice(0, 5)
        .map(row => ({ term: row.term, fields: [...new Set(row.fields)] }));
    return {
        id: category.id,
        label: category.label,
        labelEn: category.labelEn,
        score: best.score,
        confidence,
        evidence: evidence.length > 0 ? evidence : [],
    };
}

/**
 * Public category list for clients (labels only; counts are computed from the
 * live index).
 * @returns `[{ id, label, labelEn }]`.
 */
export function categoryList() {
    return CATEGORIES.map(({ id, label, labelEn }) => ({ id, label, labelEn }));
}
