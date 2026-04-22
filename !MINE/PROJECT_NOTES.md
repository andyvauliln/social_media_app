# Content Production Project

### SOCIAL MEDIA APP

The goal is that i can from telegram (or by use claud code or cursor code or any another such application directly) i can develop application for content creation and create content by using content creation agent.

So main development agent who also has claud code subagent for content creation and who also separated and isolated from development  claud code settings like skills, hooks, agents. So development agent should see, develop and if need use content agent but content agent should know noting about development agent and don’t use his skills hooks and agents etc.

### **Core Architecture**

- **UI**
    - Telegram bot and bot in group chat
        
        can control from telegram bot or group bot connected
        
    - Administration web app (Later)
        - Logs
        - Dashboard
        - Chat for Test Agent
        - Test for all Functions
        - Contents Viewing
            - Channels
                - Ananlitics
                - Recommendations
                - Messages
                - Summary
                - Actions to make
            - Calendar For Content Posting Schedule
            - Extracted Videous
            - Posted Videous by social media
                - Post analitics
                - Money
                - Comments
        - Ideas
        - Agent Management
            - Prompts
            - Skils
            - Tools
            - Context
    - Video Editing WEB App  (Later)
        
        
- **Content Production sub agent**  [[`Need choose types or use support 2?)]]`
    - Type
        - SDK
        - MD
    - Skills
    - Agents
        
        ### Social media sub agents
        
        Should handle any question with social media platforms
        
        ### INSTAGRAM AGENT (FIRST)
        
        - Channels Folder
            - AI, IT (First)
                
                AI, IT news content
                
                Selling Mini Apps content
                
                Educational content
                
                Community like Post
                
                Events
                
            - PERSONAL
                
                Business 
                
                Startup
                
                Wisdom
                
                Lifestyle
                
            - NEWS
                
                Political, Shocking, Interesting World wide news
                
                Opinion on events
                
                Regional news
                
            - WEB 3
            - KIDS
            - PARENTS
            - Review / Sell Channel
            - Replica for paid account
        - Content Posting Strategy Page
        - Account Growth Strategy
        - Instagram Polices
        - Hooks
            
            on user start follow
            
            on subscription
            
            on user message
            
            If text …
            
            on a post comment
            
            if text
            
            if followed
            
            on a like
            
            on a repost
            
            on post posted
            
        - Account Analytics
        - Account Management
        - CRUD Comments
            
            Make Comment
            
            Delete Comment
            
            Edit Comment
            
            Read Comments (on a post, or specific channel)
            
        - Advertisement
        - Post
        - Agent Page
        - **TikTock (Later)**
        - **Twitter (Later)**
        - **Youtube (Later)**
        - **Threads (Later)**
        - **Telegram (Later)**
        - **Facebook (Later)**
        - **WhatsApp** **(Later)**
        
        ### **Content creation sub agent**  (scope of .md and python or node codes files)
        
        - Video Editing
        - Voice Generation
            - Own Voice
            - Good English Voices
            - Character Voices (Like for example Rick from Morty)
            - Good another Language Voices
        - Voice Transcription
        - Add Subtitles
        - Remove Objects
            - Remove Subtitles
            - Remove Person
            - Background
        - Flip Face/ Person
        - Lips Sync
        - Reaction on a Post
        - Silent Reaction on a Post
        - Change Language
        - Video with Audio Generation
        - Video Generation
        - Image Generation
        - Reaction Generation for Insertion in a Video
        - Sound Generation
        - Split music on a parts
        
        ### Content Orchestration Agent
        
        Can combine many short videos in cohesive long Video inserting and managing video
        
        - Insert in a video, Video Reactions
        - Make Pictures for all frames for the video
            
            
        
        ### Translate Agent
        
        - Translate to Indonesian
            
            Inodnesian Translation:
            [https://blogs.doctranslate.io/2026/02/17/ar/7-best-english-to-indonesian-translation-apis-for-2025/](https://blogs.doctranslate.io/2026/02/17/ar/7-best-english-to-indonesian-translation-apis-for-2025/)
            
        - Translate to English
            
            Research best model for that
            
        
        ### Convert Agent
        
        ### Content Extraction Agent
        
        - Extract Music
        - Extract Voice
        - Extract Topic
        - Extract Summary
        - Extract Key Takeaways
        - Find Interesting Parts
        - Extract Specific Video Parts
        
        ### Research and Idea generation Agent
        
        Collect Daily Content 
        
        Send topics to Approve
        
        Make Content
        
        Schedule Post
        
        ### Project Management Agent
        
        ### Content Production Expert Agent
        
        ### Quality Control Agent
        
    - Hooks
    - Memory
    - Claude.md
- **DB  Sub Agent**
    
    Know everything about content menagment db
    
    Can manipulate with db answer question or request for db change
    
    ll be used for development and and for content managment agent
    
- **Development Agent Main (Claude Code, Cursor, Codex, Google)**
    
    To develop content Production Agent
    
    All skills, commands, configurations, mcp, plugins and etc… should be synchronised 
    
    ### .CLAUDE (Global for Development only with own hooks, skills, agents, memory, CLAUDE.md)
    
    - skills
    - hooks
    - agents
    - memory
    - CLAUDE.md
    
    ### .CLAUDE (Project level for Development only with own hooks, skills, agents, memory, CLAUDE.md)
    
    - skills
    - hooks
    - agents
    - memory
    - CLAUDE.md
- **Server**
    - **API**
        
        `[[choose stack create api enpoints for ui]]`
        
    - **Scripts**
- **DB (for content creation agent and manegment)**
    
    Codex could be or local db, maybe do on a replit?
    
    `[[Need decide what to do]]`
    
    `[[Need make schema]]`
    
    - Post
        - id
        - content_ids[]
        - social_medida: [instagram]
        - title: “”
        - tags: []
        - post_settings: {}
        - description: “”
        - analytics { instagram post, reels analitics like likes: {number}, comments_amount, and another anailitics  `[[ need to figure out full object from instagram api available]]`
        - 
        - comments [ {account: “”, comment: “”,  likes: “1”, replies: [{account: “”, comment: “”, like: “”}]}]
        - type:[post, carousel_post, reel, advertisment, story]
        - status: [posted, scheduled, pending]
        - created_at
        - updated_at
        - created_by
        - scheduled_at
        - notes
    - Content
        - id
        - name
        - description
        - tags:
        - type [generated, downloaded]
        - format [jpg, mp4]
        - format type: [image, video, audio]
        - file_path
        - status: [processing, ready_to_post, posted, archived,deleted]
        - duration
        - has_video_sound: [true, false]
        - sound_ids:[if has_video_sound false still can have]
        - sources [instagram, tiktok, youtube]
        - social_media_links
        - url
        - sessions
        - review
        - frames
        - notes
        - prompt
        - model
        - artifacts_ids
        - created_at
        - update_at
        - created_by
- **KNOWLEDGE BASE**
    
    ll be used for agents and for  developer and who will be use this project for build, mange and produce content for social media. Some of the files should be updated on a hook some from chat i can ask make research and add something new here, and some scheduled actions. Knowledge base should be synced with notion
    
    - **INDEXER**
        
        All files in knoweldge base with desctiption what they for. For ai agent to better navigate 
        
        Shoud be udpated every time when some file was added or deleted from knowledge base folder
        
    - **LOGS**
        - **APP DEV LOGS**
            
            Last 2 request logs
            
            should show all functions in and out and models in and out plus context size and price for it
            
            Template: `[[Make Template]]`
            
            All logs
            
        - **CONTENT CREATION LOGS**
    - **DEV PROJECT MANAGEMENT**
        - **IDEAS**
        - **QUESTIONS**
        - **NOTES PAGE**
        - **TODO**
            - DONE
            - TODAY
            - BAGPACK
                - Buy Purchase
                    
                    **TODO:**
                    
                    - [ ]  Check how to buy it safe
                    - [ ]  Research platform
                    - [https://socialtradia.com/](https://socialtradia.com/)
                    - [https://fameswap.com/auth/register/step1](https://fameswap.com/auth/register/step1)
                    - PlayerUp
                    - [ ]  Explore how does is it work in comparison
                        - [ ]  Duplicate some account that starts from 0 and check how different
                - **RESEARCH**
                    - [ ]  Find  accounts to replicate in another country
                    - [ ]  Research best upscale model/platform (price/ quality)
                    - [ ]  Research best quality and Price models, understand differences for generation and editing
                    - [ ]  Check how much accounts under one number in Instagram i think 5 max
                    - [ ]  Research mcp, skills for managing Instagram
                    - [ ]  Research about Instagram configuration for start channel
                    - [ ]  Find related github repos
                    - [ ]  Research available MCPs
                    - [ ]  Research Instagram Ads
                    - [ ]  Connect AI to the messages
                    - [ ]  Check what possible configure in a posts/reels
                    - [ ]  Have Full Instagram/Facebook API
                    
                - [ ]  Get all credentials for instagram
    - **CONTENT CREATION MANAGMENT**
        - **Posting Technics Page**
            
            ll be used for content managment agent as a context but we ll keep it here that we also can see it and correct 
            
    - **DEV KNOWLEDGE  BASE**
        - **DOCUMENTATION**
            
            ALL RELATED DOCUMENTATION ON A PROJECT 
            
        - **TERMINAL COMMANDS**
            
            History of all commands run in terminals
            
        - **APIs**
            
            collections of different apis with examples of endpoints input and output
            
            - **INDONESIAN TRANSLATIONS**
                
                Description and link to documentation
                [https://blogs.doctranslate.io/2026/02/17/ar/7-best-english-to-indonesian-translation-apis-for-2025/](https://blogs.doctranslate.io/2026/02/17/ar/7-best-english-to-indonesian-translation-apis-for-2025/)
                
                - API
                    
                    Description
                    
                    /endpoint 
                    
                    Input
                    
                    Output
                    
        - **SKILLS**
            - all dev skills
            - all content creation skills
        - **COMMANDS**
            
            list of all dev commands
            
            list of all content creation agent commands
            
        - **AGENTS**
            
            List of all dev agents
            
            List of all content creation Agents
            
        - **MODELS APIS**
            
            collection of requests to models apis
            
        - **USEFULL LINKS**
            
            link description list of fetures and what unique features
            
            [https://artificialanalysis.ai/video/leaderboard/image-to-video](https://artificialanalysis.ai/video/leaderboard/image-to-video) models arena
            
        - **GITHUB PROJECTS FOLDER**
            
            for usefull project that need to check or research or whatever
            
            **LIST PAGE**
            
            **PROJECT FOLDER**
            
    - **CONTE CREATION KNOWLEDGE BASE**
        - **FLOWS EXAMPLES**
            
            Described different use flow
            
            should be also updated after using content creation agent and 
            
        - **MONETIZATION** **PAGGE**
            
            Described Monetization Strategies used for agent context and for developer user perspective
            
        - **ACCOUNTS PAGE**
            
            @account1 Good News Posts, Nice style….
            
    - **RESEARCHES FOLDER**
        
        Research content on different topics
        
        - **PLATFORMS/APPLICATIONS**
            
            Link on a product, features, why unique what is main feature, quality, description, links from youtube or social media. Social opinions positve and negative. open source?
            
            - **Words** by openart_ai for make 3d scenes from image and make video from there (CHECK IT)
            - Comfy UI
            - HegsField
            - Wavespeed [[https://wavespeed.ai/models](https://wavespeed.ai/models)]
            - Luna AI Agent Video creation
    - **CONTENT**
        - **Collections**
            
            Contents with 
            
        - **Working Sessions**
        - **Finished Session**
        
    - **MINE**
        
        just mine notes commands or whatever included to .gitignore
        

### CONFIGURATIONS

- Content Agent
    
    update_flows_example_file: false //not update FLOWS [EXAMPLE.md](http://EXAMPLE.md) file after content agent runs
    

### **Core Architecture**

- **UI**
    - Telegram bot and bot in group chat
        
        can control from telegram bot or group bot connected
        
    - Administration web app
        - Logs
        - Dashboard
        - Chat for Test Agent
        - Test for all Functions
        - Contents Viewing
            - Channels
                - Ananlitics
                - Recommendations
                - Messages
                - Summary
                - Actions to make
            - Calendar For Content Posting Schedule
            - Extracted Videous
            - Posted Videous by social media
                - Post analitics
                - Money
                - Comments
        - Ideas
        - Agent Management
            - Prompts
            - Skils
            - Tools
            - Context
    - Video Editing WEB App  (Later)
        
        
- **Content Production sub agent**  [[`Need choose types or use support 2?)]]`
    - Type
        - SDK
        - MD
    - Skills
        
        
    - Agents
        
        ### Social media sub agents
        
        Should handle any question with social media platforms
        
        ### INSTAGRAM AGENT (FIRST)
        
        - Channels Folder
            - AI, IT (First)
                
                AI, IT news content
                
                Selling Mini Apps content
                
                Educational content
                
                Community like Post
                
                Events
                
            - PERSONAL
                
                Business 
                
                Startup
                
                Wisdom
                
                Lifestyle
                
            - NEWS
                
                Political, Shocking, Interesting World wide news
                
                Opinion on events
                
                Regional news
                
            - WEB 3
            - KIDS
            - PARENTS
            - Review / Sell Channel
            - Replica for paid account
        - Content Posting Strategy Page
        - Account Growth Strategy
        - Instagram Polices
        - Hooks
            
            on user start follow
            
            on subscription
            
            on user message
            
            If text …
            
            on a post comment
            
            if text
            
            if followed
            
            on a like
            
            on a repost
            
            on post posted
            
        - Account Analytics
        - Account Management
        - CRUD Comments
            
            Make Comment
            
            Delete Comment
            
            Edit Comment
            
            Read Comments (on a post, or specific channel)
            
        - Advertisement
        - Post
        - Agent Page
        - **TikTock (Later)**
        - **Twitter (Later)**
        - **Youtube (Later)**
        - **Threads (Later)**
        - **Telegram (Later)**
        - **Facebook (Later)**
        - **WhatsApp** **(Later)**
        
        ### **Content creation sub agent**  (scope of .md and python or node codes files)
        
        - Video Editing
        - Voice Generation
            - Own Voice
            - Good English Voices
            - Character Voices (Like for example Rick from Morty)
            - Good another Language Voices
        - Voice Transcription
        - Add Subtitles
        - Remove Objects
            - Remove Subtitles
            - Remove Person
            - Background
        - Flip Face/ Person
        - Lips Sync
        - Reaction on a Post
        - Silent Reaction on a Post
        - Change Language
        - Video with Audio Generation
        - Video Generation
        - Image Generation
        - Reaction Generation for Insertion in a Video
        - Sound Generation
        - Split music on a parts
        
        ### Content Orchestration Agent
        
        Can combine many short videos in cohesive long Video inserting and managing video
        
        - Insert in a video, Video Reactions
        - Make Pictures for all frames for the video
            
            
        
        ### Translate Agent
        
        - Translate to Indonesian
            
            Inodnesian Translation:
            [https://blogs.doctranslate.io/2026/02/17/ar/7-best-english-to-indonesian-translation-apis-for-2025/](https://blogs.doctranslate.io/2026/02/17/ar/7-best-english-to-indonesian-translation-apis-for-2025/)
            
        - Translate to English
            
            Research best model for that
            
        
        ### Convert Agent
        
        ### Content Extraction Agent
        
        - Extract Music
        - Extract Voice
        - Extract Topic
        - Extract Summary
        - Extract Key Takeaways
        - Find Interesting Parts
        - Extract Specific Video Parts
        
        ### Research and Idea generation Agent
        
        Collect Daily Content 
        
        Send topics to Approve
        
        Make Content
        
        Schedule Post
        
        ### Project Management Agent
        
        ### Content Production Expert Agent
        
        ### Quality Control Agent
        
    - Hooks
    - Memory
    - Claude.md
        
        if you don’t have skill and tool to handle request properly add task to dev agent and describe what need to be build and changed. And for user just answer “can’t handle this request now ll inform you when tool is ready”
        
- **DB  Sub Agent**
    
    Know everything about content menagment db
    
    Can manipulate with db answer question or request for db change
    
    ll be used for development and and for content managment agent
    
- **Development Agent Main (Claude Code, Cursor, Codex, Google)**
    
    To develop content Production Agent
    
    All skills, commands, configurations, mcp, plugins and etc… should be synchronised 
    
    ### .CLAUDE (Global for Development only with own hooks, skills, agents, memory, CLAUDE.md)
    
    - skills
    - hooks
    - agents
    - memory
    - CLAUDE.md
    
    ### .CLAUDE (Project level for Development only with own hooks, skills, agents, memory, CLAUDE.md)
    
    - skills
    - hooks
    - agents
    - memory
    - CLAUDE.md
- **Server**
    - **API**
        
        `[[choose stack create api enpoints for ui]]`
        
    - **Scripts**
- **DB (for content creation agent and management )**
    
    Codex could be or local db, maybe do on a replit?
    
    `[[Need decide what to do]]`
    
    `[[Need make schema]]`
    
    - Post
        - id
        - content_ids[]
        - social_medida: [instagram]
        - title: “”
        - tags: []
        - post_settings: {}
        - description: “”
        - analytics { instagram post, reels analitics like likes: {number}, comments_amount, and another anailitics  `[[ need to figure out full object from instagram api available]]`
        - 
        - comments [ {account: “”, comment: “”,  likes: “1”, replies: [{account: “”, comment: “”, like: “”}]}]
        - type:[post, carousel_post, reel, advertisment, story]
        - status: [posted, scheduled, pending]
        - created_at
        - updated_at
        - created_by
        - scheduled_at
        - notes
    - Content
        - id
        - name
        - description
        - tags:
        - type [generated, downloaded]
        - format [jpg, mp4]
        - format type: [image, video, audio]
        - file_path
        - status: [processing, ready_to_post, posted, archived,deleted]
        - duration
        - has_video_sound: [true, false]
        - sound_ids:[if has_video_sound false still can have]
        - sources [instagram, tiktok, youtube]
        - social_media_links
        - url
        - sessions
        - review
        - frames
        - notes
        - prompt
        - model
        - artifacts_ids
        - created_at
        - update_at
        - created_by
- **KNOWLEDGE BASE**
    
    ll be used for agents and for  developer and who will be use this project for build, mange and produce content for social media. Some of the files should be updated on a hook some from chat i can ask make research and add something new here, and some scheduled actions. Knowledge base should be synced with notion
    
    - **INDEXER**
        
        All files in knoweldge base with desctiption what they for. For ai agent to better navigate 
        
        Shoud be udpated every time when some file was added or deleted from knowledge base folder
        
    - **LOGS**
        - **APP DEV LOGS**
            
            Last 2 request logs
            
            should show all functions in and out and models in and out plus context size and price for it
            
            Template: `[[Make Template]]`
            
            All logs
            
        - **CONTENT CREATION LOGS**
    - **DEV PROJECT MANAGEMENT**
        - **IDEAS**
        - **QUESTIONS**
        - **NOTES PAGE**
        - **TODO**
            - DONE
            - TODAY
            - BAGPACK
                - Buy Purchase
                    
                    **TODO:**
                    
                    - [ ]  Check how to buy it safe
                    - [ ]  Research platform
                    - [https://socialtradia.com/](https://socialtradia.com/)
                    - [https://fameswap.com/auth/register/step1](https://fameswap.com/auth/register/step1)
                    - PlayerUp
                    - [ ]  Explore how does is it work in comparison
                        - [ ]  Duplicate some account that starts from 0 and check how different
                - **RESEARCH**
                    - [ ]  Find  accounts to replicate in another country
                    - [ ]  Research best upscale model/platform (price/ quality)
                    - [ ]  Research best quality and Price models, understand differences for generation and editing
                    - [ ]  Check how much accounts under one number in Instagram i think 5 max
                    - [ ]  Research mcp, skills for managing Instagram
                    - [ ]  Research about Instagram configuration for start channel
                    - [ ]  Find related github repos
                    - [ ]  Research available MCPs
                    - [ ]  Research Instagram Ads
                    - [ ]  Connect AI to the messages
                    - [ ]  Check what possible configure in a posts/reels
                    - [ ]  Have Full Instagram/Facebook API
                    
                - [ ]  Get all credentials for instagram
    - **CONTENT CREATION MANAGMENT**
    - **DEV KNOWLEDGE  BASE**
        - **DOCUMENTATION**
            
            ALL RELATED DOCUMENTATION ON A PROJECT 
            
        - **TERMINAL COMMANDS**
            
            History of all commands run in terminals
            
        - **APIs**
            
            collections of different apis with examples of endpoints input and output
            
            - **INDONESIAN TRANSLATIONS**
                
                Description and link to documentation
                [https://blogs.doctranslate.io/2026/02/17/ar/7-best-english-to-indonesian-translation-apis-for-2025/](https://blogs.doctranslate.io/2026/02/17/ar/7-best-english-to-indonesian-translation-apis-for-2025/)
                
                - API
                    
                    Description
                    
                    /endpoint 
                    
                    Input
                    
                    Output
                    
        - **SKILLS**
            - all dev skills
            - all content creation skills
        - **COMMANDS**
            
            list of all dev commands
            
            list of all content creation agent commands
            
        - **AGENTS**
            
            List of all dev agents
            
            List of all content creation Agents
            
        - **MODELS APIS**
            
            collection of requests to models apis
            
        - **USEFULL LINKS**
            
            link description list of fetures and what unique features
            
            [https://artificialanalysis.ai/video/leaderboard/image-to-video](https://artificialanalysis.ai/video/leaderboard/image-to-video) models arena
            
        - **GITHUB PROJECTS FOLDER**
            
            for usefull project that need to check or research or whatever
            
            **LIST PAGE**
            
            **PROJECT FOLDER**
            
    - **CONTE CREATION KNOWLEDGE BASE**
        - **Posting Technics Page**
            
            ll be used for content managment agent as a context but we ll keep it here that we also can see it and correct 
            
        - **FLOWS EXAMPLES**
            
            Described different prompt and what should be in result
            
            Should be also updated after using content creation agent and add new flow examples
            
            Remove background for the video and save
            
            1. content agent  
            2. content editing agent
            3. remove bg script/mcp
            
        - **MONETIZATION** **PAGGE**
            
            Described Monetization Strategies used for agent context and for developer user perspective
            
        - **ACCOUNTS PAGE**
            
            @account1 Good News Posts, Nice style….
            
    - **RESEARCHES FOLDER**
        
        Research content on different topics
        
        - **PLATFORMS/APPLICATIONS**
            
            Link on a product, features, why unique what is main feature, quality, description, links from youtube or social media. Social opinions positve and negative. open source?
            
            - **Words** by openart_ai for make 3d scenes from image and make video from there (CHECK IT)
            - Comfy UI
            - HegsField
            - Wavespeed [[https://wavespeed.ai/models](https://wavespeed.ai/models)]
            - Luna AI Agent Video creation
    - **CONTENT**
        - **Collections**
            
            Contents with 
            
        - **Working Sessions**
        - **Finished Session**
        - **CODE** **ANIMATIONS**
        
    - **MINE**
        
        just mine notes commands or whatever included to .gitignore
        

[AI EDITING](https://www.notion.so/AI-EDITING-335f1420e691803ba7a5eb54e4562390?pvs=21)

[FEATURES](https://www.notion.so/FEATURES-335f1420e69180239458ebb76ceb1491?pvs=21)