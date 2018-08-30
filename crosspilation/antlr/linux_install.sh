#!/bin/bash
sudo cp antlr-4.7.1-complete.jar /usr/local/lib/
echo 'export CLASSPATH = ".:/usr/local/lib/antlr-4.7.1-complete.jar:$CLASSPATH"' >> ~/.bash_profile
echo 'antlr4=\x27java -Xmx500M -cp "/usr/local/lib/antlr-4.7.1-complete.jar:$CLASSPATH" org.antlr.v4.Tool\x27' >> ~/.bash_profile
echo 'alias grun=\x27java org.antlr.v4.gui.TestRig\x27' >> ~/.bash_profile