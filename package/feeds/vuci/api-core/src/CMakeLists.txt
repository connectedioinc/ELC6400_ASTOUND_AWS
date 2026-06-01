cmake_minimum_required(VERSION 2.8)

project(vuci C)

add_definitions(-O -Wall -Werror --std=gnu99 -D_GNU_SOURCE)

add_library(vuci MODULE vuci.c)
target_link_libraries(vuci crypt;ubus)
set_target_properties(vuci PROPERTIES OUTPUT_NAME vuci PREFIX "")

install(TARGETS vuci
    LIBRARY DESTINATION lib/lua/
)
