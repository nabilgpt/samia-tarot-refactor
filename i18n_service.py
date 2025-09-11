"""
M27 i18n Deepening Service  
ICU MessageFormat-compatible translations for Admin flows only
"""
import os
import re
import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from dataclasses import dataclass

DSN = os.getenv("DB_DSN") or "postgresql://postgres.ciwddvprfhlqidfzklaq:SisI2009@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
POOL = SimpleConnectionPool(minconn=1, maxconn=5, dsn=DSN)

# ICU MessageFormat pattern validation
ICU_PLACEHOLDER_PATTERN = re.compile(r'\{[^}]+\}')
ICU_SELECT_PATTERN = re.compile(r'\{[\w]+,\s*select,\s*([^}]+)\}')
ICU_PLURAL_PATTERN = re.compile(r'\{[\w]+,\s*plural,\s*([^}]+)\}')

@dataclass
class Translation:
    id: Optional[int]
    message_key: str
    language_code: str
    message_text: str
    source_lang: str
    auto_translated: bool
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]
    is_approved: bool
    context_notes: Optional[str]
    pluralization_data: Optional[Dict]
    created_at: datetime
    updated_at: datetime

@dataclass
class GlossaryTerm:
    id: Optional[int]
    term: str
    definition: str
    do_not_translate: bool
    preferred_translations: Dict[str, str]
    created_at: datetime

class I18nService:
    """Internationalization service for Admin flows"""
    
    def __init__(self):
        self.supported_languages = ['en', 'ar']
        self.default_language = 'en'
    
    def validate_icu_format(self, message: str) -> Tuple[bool, List[str]]:
        """Validate ICU MessageFormat syntax"""
        errors = []
        
        # Check for unmatched braces
        brace_count = 0
        for char in message:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count < 0:
                    errors.append("Unmatched closing brace")
                    break
        
        if brace_count > 0:
            errors.append("Unmatched opening brace")
        
        # Validate placeholder syntax
        placeholders = ICU_PLACEHOLDER_PATTERN.findall(message)
        for placeholder in placeholders:
            if not self._validate_placeholder(placeholder):
                errors.append(f"Invalid placeholder syntax: {placeholder}")
        
        return len(errors) == 0, errors
    
    def _validate_placeholder(self, placeholder: str) -> bool:
        """Validate individual ICU placeholder"""
        content = placeholder.strip('{}')
        
        # Simple variable: {name}
        if re.match(r'^\w+$', content):
            return True
        
        # With type: {name, number} or {name, date}
        if re.match(r'^\w+,\s*(number|date|time)$', content):
            return True
        
        # Select format: {gender, select, male{...} female{...} other{...}}
        if 'select,' in content:
            return ICU_SELECT_PATTERN.match(placeholder) is not None
        
        # Plural format: {count, plural, =0{...} one{...} other{...}}
        if 'plural,' in content:
            return ICU_PLURAL_PATTERN.match(placeholder) is not None
        
        return False
    
    def create_translation(self, message_key: str, language_code: str, 
                          message_text: str, context_notes: str = None,
                          auto_translated: bool = False) -> Optional[Translation]:
        """Create new translation entry"""
        if language_code not in self.supported_languages:
            raise ValueError(f"Unsupported language: {language_code}")
        
        # Validate ICU format
        valid, errors = self.validate_icu_format(message_text)
        if not valid:
            raise ValueError(f"Invalid ICU format: {', '.join(errors)}")
        
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into translations 
                    (message_key, language_code, message_text, auto_translated, context_notes)
                    values (%s, %s, %s, %s, %s)
                    on conflict (message_key, language_code) do update set
                        message_text = excluded.message_text,
                        auto_translated = excluded.auto_translated,
                        context_notes = excluded.context_notes,
                        updated_at = now()
                    returning id, created_at, updated_at
                """, (message_key, language_code, message_text, auto_translated, context_notes))
                
                row = cur.fetchone()
                conn.commit()
                
                if row:
                    return Translation(
                        id=row[0],
                        message_key=message_key,
                        language_code=language_code,
                        message_text=message_text,
                        source_lang=self.default_language,
                        auto_translated=auto_translated,
                        reviewed_at=None,
                        reviewed_by=None,
                        is_approved=not auto_translated,  # Manual entries approved by default
                        context_notes=context_notes,
                        pluralization_data=None,
                        created_at=row[1],
                        updated_at=row[2]
                    )
        finally:
            POOL.putconn(conn)
    
    def batch_translate(self, translations_data: List[Dict], auto_translate: bool = False) -> Dict[str, Any]:
        """Batch create/update translations"""
        results = {
            'created': 0,
            'updated': 0,
            'errors': []
        }
        
        for data in translations_data:
            try:
                message_key = data['message_key']
                language_code = data['language_code']
                message_text = data['message_text']
                context_notes = data.get('context_notes')
                
                translation = self.create_translation(
                    message_key, language_code, message_text, 
                    context_notes, auto_translate
                )
                
                if translation:
                    results['created'] += 1
                
            except Exception as e:
                results['errors'].append({
                    'key': data.get('message_key', 'unknown'),
                    'error': str(e)
                })
        
        return results
    
    def get_translation(self, message_key: str, language_code: str) -> Optional[Translation]:
        """Get specific translation"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select id, message_key, language_code, message_text, source_lang,
                           auto_translated, reviewed_at, reviewed_by, is_approved,
                           context_notes, pluralization_data, created_at, updated_at
                    from translations
                    where message_key = %s and language_code = %s
                """, (message_key, language_code))
                
                row = cur.fetchone()
                if row:
                    return Translation(*row)
        finally:
            POOL.putconn(conn)
    
    def get_translations(self, message_key: str = None, language_code: str = None,
                        needs_review: bool = False, limit: int = 100) -> List[Translation]:
        """Get translations with optional filters"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                query = """
                    select id, message_key, language_code, message_text, source_lang,
                           auto_translated, reviewed_at, reviewed_by, is_approved,
                           context_notes, pluralization_data, created_at, updated_at
                    from translations
                    where 1=1
                """
                params = []
                
                if message_key:
                    query += " and message_key = %s"
                    params.append(message_key)
                
                if language_code:
                    query += " and language_code = %s"
                    params.append(language_code)
                
                if needs_review:
                    query += " and auto_translated = true and is_approved = false"
                
                query += " order by updated_at desc limit %s"
                params.append(limit)
                
                cur.execute(query, params)
                return [Translation(*row) for row in cur.fetchall()]
        finally:
            POOL.putconn(conn)
    
    def approve_translation(self, translation_id: int, reviewer_id: str) -> bool:
        """Approve translation after human review"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    update translations 
                    set is_approved = true, reviewed_at = now(), reviewed_by = %s
                    where id = %s and auto_translated = true
                    returning id
                """, (reviewer_id, translation_id))
                
                conn.commit()
                return cur.fetchone() is not None
        finally:
            POOL.putconn(conn)
    
    def reject_translation(self, translation_id: int, reviewer_id: str) -> bool:
        """Reject auto-translated entry (keeps entry but marks as needing work)"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    update translations 
                    set is_approved = false, reviewed_at = now(), reviewed_by = %s
                    where id = %s
                    returning id
                """, (reviewer_id, translation_id))
                
                conn.commit()
                return cur.fetchone() is not None
        finally:
            POOL.putconn(conn)
    
    def get_coverage_status(self) -> Dict[str, Any]:
        """Get translation coverage status"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                # Overall stats
                cur.execute("""
                    select 
                        language_code,
                        count(*) as total_translations,
                        count(*) filter (where is_approved = true) as approved_translations,
                        count(*) filter (where auto_translated = true and is_approved = false) as pending_review,
                        count(*) filter (where auto_translated = false) as manual_translations
                    from translations
                    group by language_code
                    order by language_code
                """)
                
                language_stats = {}
                for row in cur.fetchall():
                    lang, total, approved, pending, manual = row
                    language_stats[lang] = {
                        'total_translations': total,
                        'approved_translations': approved,
                        'pending_review': pending,
                        'manual_translations': manual,
                        'coverage_rate': round(approved / total * 100, 2) if total > 0 else 0
                    }
                
                # Missing translations (keys that exist in EN but not other languages)
                cur.execute("""
                    select distinct message_key
                    from translations 
                    where language_code = 'en'
                    except
                    select distinct message_key
                    from translations
                    where language_code = 'ar'
                """)
                
                missing_ar = [row[0] for row in cur.fetchall()]
                
                return {
                    'language_stats': language_stats,
                    'missing_translations': {
                        'ar': missing_ar
                    },
                    'supported_languages': self.supported_languages
                }
        finally:
            POOL.putconn(conn)
    
    def add_glossary_term(self, term: str, definition: str, do_not_translate: bool = False,
                         preferred_translations: Dict[str, str] = None) -> Optional[GlossaryTerm]:
        """Add term to translation glossary"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    insert into translation_glossary 
                    (term, definition, do_not_translate, preferred_translations)
                    values (%s, %s, %s, %s)
                    on conflict (term) do update set
                        definition = excluded.definition,
                        do_not_translate = excluded.do_not_translate,
                        preferred_translations = excluded.preferred_translations
                    returning id, created_at
                """, (term, definition, do_not_translate, preferred_translations or {}))
                
                row = cur.fetchone()
                conn.commit()
                
                if row:
                    return GlossaryTerm(
                        id=row[0],
                        term=term,
                        definition=definition,
                        do_not_translate=do_not_translate,
                        preferred_translations=preferred_translations or {},
                        created_at=row[1]
                    )
        finally:
            POOL.putconn(conn)
    
    def get_glossary_terms(self) -> List[GlossaryTerm]:
        """Get all glossary terms"""
        conn = POOL.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    select id, term, definition, do_not_translate, preferred_translations, created_at
                    from translation_glossary
                    order by term
                """)
                
                return [GlossaryTerm(*row) for row in cur.fetchall()]
        finally:
            POOL.putconn(conn)
    
    def protect_glossary_terms(self, text: str) -> str:
        """Protect glossary terms from translation by wrapping in markers"""
        glossary = self.get_glossary_terms()
        protected_text = text
        
        for term in glossary:
            if term.do_not_translate:
                # Wrap protected terms with markers
                protected_text = protected_text.replace(
                    term.term, f"<<PROTECTED:{term.term}>>"
                )
        
        return protected_text
    
    def unprotect_glossary_terms(self, text: str) -> str:
        """Remove protection markers from glossary terms"""
        # Remove protection markers
        import re
        return re.sub(r'<<PROTECTED:([^>]+)>>', r'\1', text)
    
    def simulate_auto_translate(self, text: str, target_lang: str) -> str:
        """Simulate auto-translation (placeholder for real provider)"""
        # In real implementation, would call translation service API
        # For now, return a marked placeholder
        
        if target_lang == 'ar':
            # Simple simulation - just mark as auto-translated
            return f"[AUTO_TRANSLATED_AR] {text}"
        
        return text
    
    def auto_translate_missing(self, target_language: str = 'ar') -> Dict[str, Any]:
        """Auto-translate missing entries for target language"""
        conn = POOL.getconn()
        results = {
            'translated': 0,
            'errors': [],
            'skipped': 0
        }
        
        try:
            with conn.cursor() as cur:
                # Find missing translations
                cur.execute("""
                    select t.message_key, t.message_text, t.context_notes
                    from translations t
                    where t.language_code = 'en' 
                      and t.is_approved = true
                      and not exists (
                        select 1 from translations t2 
                        where t2.message_key = t.message_key 
                          and t2.language_code = %s
                      )
                    limit 50  -- Batch limit
                """, (target_language,))
                
                missing_entries = cur.fetchall()
                
                for message_key, source_text, context_notes in missing_entries:
                    try:
                        # Protect glossary terms
                        protected_text = self.protect_glossary_terms(source_text)
                        
                        # Simulate auto-translation
                        translated_text = self.simulate_auto_translate(protected_text, target_language)
                        
                        # Unprotect glossary terms
                        final_text = self.unprotect_glossary_terms(translated_text)
                        
                        # Create translation entry
                        translation = self.create_translation(
                            message_key, target_language, final_text,
                            context_notes, auto_translated=True
                        )
                        
                        if translation:
                            results['translated'] += 1
                        
                    except Exception as e:
                        results['errors'].append({
                            'key': message_key,
                            'error': str(e)
                        })
                
                return results
        finally:
            POOL.putconn(conn)