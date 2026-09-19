use std::path::Path;
use anyhow::Result;
use tantivy::schema::*;
use tantivy::{doc, Index, IndexReader, IndexWriter, ReloadPolicy, snippet::SnippetGenerator};
use tantivy::query::QueryParser;
use tantivy::collector::TopDocs;

use crate::domain::{SearchDocument, SearchResult};

pub struct SearchEngine {
    index: Index,
    reader: IndexReader,
    project_id: Field,
    path: Field,
    title: Field,
    content: Field,
}

impl SearchEngine {
    pub fn open_or_create(dir: &Path) -> Result<Self> {
        let mut schema_builder = Schema::builder();
        
        let project_id = schema_builder.add_text_field("project_id", STRING | STORED);
        let path = schema_builder.add_text_field("path", STRING | STORED);
        let title = schema_builder.add_text_field("title", TEXT | STORED);
        let content = schema_builder.add_text_field("content", TEXT | STORED);
        
        let schema = schema_builder.build();
        
        std::fs::create_dir_all(dir)?;
        let index = Index::open_or_create(tantivy::directory::MmapDirectory::open(dir)?, schema)?;
        
        let reader = index
            .reader_builder()
            .reload_policy(ReloadPolicy::OnCommitWithDelay)
            .try_into()?;
            
        Ok(Self {
            index,
            reader,
            project_id,
            path,
            title,
            content,
        })
    }
    
    pub fn get_writer(&self) -> Result<IndexWriter> {
        Ok(self.index.writer(50_000_000)?)
    }
    
    pub fn add_document(&self, doc: SearchDocument) -> Result<()> {
        let mut writer = self.get_writer()?;
        writer.add_document(doc!(
            self.project_id => doc.project_id,
            self.path => doc.path,
            self.title => doc.title,
            self.content => doc.content,
        ))?;
        writer.commit()?;
        Ok(())
    }
    
    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<SearchResult>> {
        let searcher = self.reader.searcher();
        let query_parser = QueryParser::for_index(&self.index, vec![self.title, self.content]);
        let query = query_parser.parse_query(query_str)?;
        
        let top_docs = searcher.search(&query, &TopDocs::with_limit(limit))?;
        
        let mut results = Vec::new();
        let snippet_generator = SnippetGenerator::create(&searcher, &*query, self.content)?;
        
        for (score, doc_address) in top_docs {
            let retrieved_doc: tantivy::TantivyDocument = searcher.doc(doc_address)?;
            
            let pid = retrieved_doc.get_first(self.project_id)
                .and_then(|f| f.as_str()).unwrap_or("").to_string();
            let p = retrieved_doc.get_first(self.path)
                .and_then(|f| f.as_str()).unwrap_or("").to_string();
            let t = retrieved_doc.get_first(self.title)
                .and_then(|f| f.as_str()).unwrap_or("").to_string();
                
            let snippet = snippet_generator.snippet_from_doc(&retrieved_doc).to_html();
            
            results.push(SearchResult {
                project_id: pid,
                path: p,
                title: t,
                snippet,
                score,
            });
        }
        
        Ok(results)
    }
}
