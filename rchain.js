const fs = require('fs');

class RChain{

    static run(filePath){
        return RChain._replaceReturn(filePath,(ctx, t)=>{
            
            let file = filePath;
            let line = t.lineNo;

            let lastLineIndex =  ctx.text.lastIndexOf('\n',t.begin);
            let from = 0;
            if(lastLineIndex!=-1){
                const firstLastLineIndex = lastLineIndex;
                lastLineIndex =  ctx.text.lastIndexOf('\n',Math.max(0,firstLastLineIndex-1));
                if(lastLineIndex!=-1){
                    from = lastLineIndex;
                    line = line-1;
                }else{
                    from = firstLastLineIndex;
                }
            }

            let scopeCode = ctx.text.substring(from,t.begin);
            scopeCode = scopeCode.replace(/\n/g,' ');
            scopeCode = scopeCode.replace(/\s+/g,' ');

            const replaceCode =  `console.log(\`[DEBUG]${scopeCode} [at ${file}:${line}]\`);return`;
            console.log(replaceCode);
            // return replaceCode;
        });
    }

    static _replaceReturn(filePath,replace){
        let text = fs.readFileSync(filePath,'utf8');
        let context = {
            text: text,
            output: null,
            pos: 0,
            end: false,
            lines: [],
            lineNo: 0,
            column: 0,
            tokens:[],
            returns:[],
            token:{
                begin:0,
                end:0,
                type:null
            }
        };
    
        try{
            console.log('auto log');
            RChain._replaceReturnImpl(context,replace);
        }catch(e){
            console.error('require module failed, at: '+filePath);
            console.error(e);
            console.quit();
        }
    
        return context.output;
    }

    static _replaceReturnImpl(context,replace){

        let stepChar = (count)=>{
    
            count = count==null?1:count;
    
            let stepCharOnce = ()=>{
                let c = context.text[context.pos];
                context.pos++;
    
                let line = ['\n','\r','\r\n'];
                if(line.indexOf(c)>=0){
                    context.lineNo++;
                    context.column = 0;
                }else{
                    context.column++;
                }
                
                if(context.pos==context.text.length){
                    context.end = true;
                }

                // console.log(c);
            };
    
            for(let i=0;i<count;i++){
                if(context.end){
                    return;
                }
                stepCharOnce();
            }
        };
    
        let nextChar = (count)=>{
            if(context.end){
                return null;
            }else{
                if(count==null){
                    return context.text[context.pos];   
                }else{
                    if(context.pos+count>context.text.length){
                        return null;
                    }else{
                        return context.text.substring(context.pos,context.pos+count);    
                    }
                }
            }
        };
    
        let nextCharOffset = (offset,count)=>{
            if(context.end){
                return null;
            }else{
                console.assert(offset!=null);
                console.assert(count!=null);
                if(context.pos+offset+count>=context.text.length){
                    return null;
                }else{
                    return context.text.substring(context.pos+offset,context.pos+offset+count);    
                }
            }
        };
    
        // lookup
        let lookupSpace = (c)=>{
            if(c==null){
                c = nextChar();
            }
            let spaces = [' ','\t','\b','\n','\v','\r','\r\n'];
            return spaces.indexOf(c)>=0;
        };
    
        let lookupSingleLineComment = ()=>{
            let c = nextChar(2);
            return c==='//';
        }
    
        let lookupMultiLineComment = ()=>{
            let c = nextChar(2);
            return c==='/*';
        };
    
        let lookupComment = ()=>{
            let c = nextChar(2);
            return c==='//'||c==='/*';
        };
    
        let lookupString = ()=>{
            let c = nextChar();
            let quotes = [`'`,`"`,'`'];
            return quotes.indexOf(c)>=0;
        };
    
        // eat token
        
        let skipChar = (ch)=>{
            let c = nextChar(ch.length);
            if(c===ch){
                stepChar(ch.length);
                return true;
            }
            return false;
        };
    
        let skipSpaces = ()=>{
            let spaces = [' ','\t','\b','\n','\v','\r','\r\n'];
            let hint=false;
            while(true){
                let c = nextChar();
                if(c==null){
                    return hint;
                }
    
                if(spaces.indexOf(c)>=0){
                    // 吃豆子
                    if(!hint){
                        hint = true;
                        context.token.type='whitespace';
                    }
                    stepChar();
                }else{
                    // 不是豆子，给别人
                    return hint;
                }
            }
        };
    
        let skipQuoteString = (sc)=>{
            let last = null;
    
            let c = nextChar();
            if(c==null){
                return false;
            }
    
            // 左引号
            if(c===`${sc}`){
                stepChar();
                while(true){
                    c = nextChar();
                    if(c==null){
                        return false;
                    }
    
                    if(c===`${sc}`&&last!==`\\`){
                        // 最后一个豆子
                        stepChar();
                        return true;
                    }else{
                        // 吃豆子
                        if(last==='\\'&&c==='\\'){
                            last = null;
                        }else{
                            last = c;    
                        }
                        stepChar();
                    }
                }
            }else{
                return false;    
            }
        };
    
        let skipString = ()=>{
            let strs = [`'`,`"`,'`'];
            for(let str of strs){
                if(skipQuoteString(str)){
                    context.token.type='string';
                    return true;
                }
            }
            return false;
        };
    
    
        let skipLine = ()=>{
            let line = ['\n','\r','\r\n'];
            let hint=false;
            while(true){
                let c = nextChar();
                if(c==null){
                    return hint;
                }
    
                if(line.indexOf(c)<0){
                    // 吃豆子
                    if(!hint){
                        hint = true;
                    }
                    stepChar();
                }else{
                    // 最后一个豆子
                    stepChar();
                    return hint;
                }
            }
        };
    
        let skipComment = ()=>{
            let c = nextChar(2);
            if(c==null){
                return false;
            }
    
            if(c=='//'){
                stepChar(2);
                skipLine();
                context.token.type='singleLineComment';
                return true;
            }else if(c=='/*'){
                stepChar(2);
                let last = c;
                while (true) {
                    c = nextChar(2);
                    if(c==='*/'){
                        stepChar(2);
                        return true;
                    }else if(c[1]==='*'){
                        stepChar();
                    }else {
                        stepChar(1);
                    }
                }
            }else{
                return false;
            }
        };
    
        let skipComments = ()=>{
            let hint = false;
            while (true) {
                if(skipComment()){
                    hint = true;
                    skipSpaces();
                }else{
                    return hint;
                }
            }
        };

        let skipStrings = ()=>{
            let hint = false;
            while (true) {
                if(skipString()){
                    hint = true;
                    skipSpaces();
                    skipComments();
                }else{
                    return hint;
                }
            }
        };
    
        let tokenStart = ()=>{
            context.token.begin = context.pos;
            context.token.end = 0;
            context.token.type = null;
        };
    
        let tokenEnd = (ret)=>{
    
            if(!ret){
                return null;
            }
    
            context.token.end = context.pos;
            if(context.token.type==='singleLineComment'){
                context.token.end--;
            }
            let t = context.text.substring(context.token.begin, context.token.end);
            context.token.lineNo = context.lineNo+1;
            context.token.column = context.column;
            context.token.text = t;
            context.token.next = context.text.substring(context.token.end,context.token.end+10);;
    
            let token = Object.assign({},context.token);
    
            if(context.token.type!=='whitespace'){
                 context.tokens.push(token);     
            }
    
            return token;
        };
    
        // eat
    
        let eatSpaces = ()=>{
            tokenStart();
            let ret = skipSpaces();
            tokenEnd(ret);
            return ret;
        };
    
        let eatComment = ()=>{
            tokenStart();
            let ret = skipComment();
            tokenEnd(ret);
            return ret;
        };
    
        let eatString = ()=>{
            tokenStart();
            let ret = skipString();
            tokenEnd(ret);
            return ret;
        };
    
        // eat more
        let eatComments = ()=>{
            let hint = false;
            while (true) {
                if(eatComment()){
                    hint = true;
                    eatSpaces();
                }else{
                    return hint;
                }
            }
        };
    
        let eatStrings = ()=>{
            let hint = false;
            while (true) {
                if(eatString()){
                    hint = true;
                    eatSpaces();
                    eatComments();
                }else{
                    return hint;
                }
            }
        };
    
        let lookupReturn = (info)=>{
            let totalOffset = 0;
            let offset = 0;
    
            let store = {
                pos: context.pos,
                lineNo: context.lineNo,
                column: context.column,
                end: context.end
            };
    
            let push = ()=>{
                offset = 0;
                store.pos = context.pos;
                store.lineNo = context.lineNo;
                store.column = context.column;
                store.end = context.end;
            };
    
            let pop = (addOffset)=>{
                offset = context.pos - store.pos;
                if(addOffset){
                    totalOffset += offset;
                }

                context.pos = store.pos;
                context.lineNo = store.lineNo;
                context.column = store.column;
                context.end = store.end;

                return offset;
            };
    
            // prefix
            push();
            let c = nextChar();
            if([';'].indexOf(c)>=0){
                stepChar();
                skipSpaces();
                skipComments();
            }
            pop(true);
    
            // lookup 'require'
            if(nextCharOffset(totalOffset,6)==='return'){
                
                skipChar('return');
                skipComments();

                const valid = [';','(','{'];
                if(lookupSpace()||valid.includes(nextChar())){
                    info.offset = totalOffset;
                    return true;
                }else{
                    // console.log('false',nextChar());
                    return false;
                }
            }else{
                return false;
            }
        };
    
        let eatReturn = (info)=>{
    
            stepChar(info.offset);
            
            tokenStart();
            skipChar('return');
            let r = tokenEnd(true);
            if(r!=null){
                context.returns.push(r);    
            }
    
            skipSpaces();
            skipComments();
    
            return true;
        };
    
        let eatAndLookup = ()=>{
            let info = {
                offset:0
            };

            if(context.text.length===0){
                context.end = true;
            }

            while(true){
                if(context.end){
                    // console.log('context.end');
                    return {
                        type: 'end',
                        info: info
                    };
                }
    
                if(lookupSpace()){
                    // console.log('lookupSpace');
                    return {
                        type:'space',
                        info:info
                    };
                }
    
                if(lookupComment()){
                    // console.log('lookupComment');
                    return {
                        type:'comment',
                        info:info
                    };
                }
    
                if(lookupString()){
                    // console.log('lookupString');
                    return {
                        type:'string',
                        info:info
                    };
                }
    
                if(lookupReturn(info)){
                    return {
                        type:'return',
                        info:info
                    };
                }
    
                // eat
                // console.log('eat');
                stepChar();
            }
        };
    
        let eat = ()=>{
            let r = eatAndLookup();
            switch (r.type) {
                case 'space':
                    return skipSpaces(r.info);      // do not need spaces info, just skip
                case 'comment': 
                    return skipComments(r.info);    // do not need comments info, just skip
                case 'string':
                    return skipStrings(r.info);     // do not need strings info, just skip
                case 'return':
                    return eatReturn(r.info);      // we are really need the require info, eat
                default:
                    return false;
            }
        };
    
        let translate = ()=>{
            if(context.returns.length===0){
                context.output = context.text;
                return;
            }
    
            let lastEnd = 0;
            let outputs = [];
    
            for(let t of context.returns){
                outputs.push(context.text.substring(lastEnd,t.begin));
                outputs.push(replace(context, t));
                lastEnd = t.end;
            }
    
            if(lastEnd<context.text.length){
                outputs.push(context.text.substring(lastEnd,context.text.length));    
            }
            
            context.output = outputs.join('');
            return;
        };
    
        // parse
        let parse = ()=>{
            while(eat()){}
        };
    
        try{
            parse();
            translate();
        }catch(e){
            const env = `pos:${context.pos}, length:${context.text.length}}, context.lineNo:${context.lineNo}, context.column:${context.column}`;
            const pre  = Math.min(context.pos-10,0);
            const post = Math.min(context.pos+10, context.text.length);
            const preCode = context.text.substring(pre, context.pos);
            const postCode = context.text.substring(context.pos, post);

            const errorMessage = [
                `->env:${env}`,
                `->pre code:${preCode}`,
                `->post code:${postCode}`,
                e.stack,
            ];

            throw new Error(errorMessage);
        }

        return;
    }
}

const path = require('path');
const code = RChain.run(path.join(__dirname,'rchain.js'));
// console.log(code);