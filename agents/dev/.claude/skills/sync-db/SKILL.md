---
name: sync-db
description: Sync different versions of db
argument-hint: ""
user-invocable: true
model: claude-haiku-4-6
effort: low
context: fork
agent: ""
paths: []
shell: bash
hooks: {}
---
main problem that at the begining i think we will use localdb so we need sync them between main and branches if someone update schema and etc. for now i can see solution that we not commit db and always recreate it from script need think and research about it  
should sync different versions of db