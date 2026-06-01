#include <stdio.h>
#include <stdlib.h>

#include "cio-version.h"
#include "build-date.h"
#include "build-number.h"

int main(int argc, char **argv)
{
//    char openwrt_version[512] = { 0 };
    char openwrt_version[512] = "AR64E 07.21.1.5";
    FILE *fptr = NULL;

//    if ((fptr = fopen("/etc/openwrt_version", "r")) != NULL) {
//        fscanf(fptr, "%[^\n]", openwrt_version);
//    }
    
    if (strlen(openwrt_version)) {
        printf("Base OS Version  : %s\n", openwrt_version);
    }

    printf("CIO Build Number : %d\n", __BUILD_NUMBER);
    printf("CIO Build date   : %s\n", __BUILD_DATE); 

    //if ((argc > 1) && (argv[1][0] == '-') && (argv[1][1] == 'v')) {
    //}

    if (fptr) fclose(fptr);
    return 0;
}
