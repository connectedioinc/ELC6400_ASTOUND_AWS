CC = gcc
CFLAGS = -Wall 
OBJS = build.o
all: build 

%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

build: $(OBJS)
	$(CC) -o $@ $(OBJS)

clean:
	rm -f rbcfg *.o
