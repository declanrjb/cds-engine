library(tidyverse)
library(kableExtra)

git_base_link <- 'https://github.com/declanrjb/cds-engine/blob/main/'

files <- list.files('data/cds-docs', recursive=TRUE, full.names=TRUE)
directory <- read_csv('data/ipeds/hd2025.csv')
directory <- directory |> 
  select(UNITID, INSTNM, STABBR) |>
  mutate(
    UNITID = as.character(UNITID)
  )

files <- as_tibble(files)
colnames(files) <- c('file')

files$unitid <- files$file |>
  str_split_i('/', -1) |>
  str_replace('.pdf', '')

files$year <- files$file |>
  str_split_i('/', -2) |>
  str_split_i('-', 1)

files$url <- paste(git_base_link, files$file, '?token=A2MPB4CGSY4ZJYD25HC6263KPAI7E', sep='')

files$anchor <- files$url |>
  lapply(function(url) {
    str_glue('<a class="file" href="{url}"><i class="fa-solid fa-file-lines"></i></a>')
  }) |>
  unlist()

files <- files |>
  left_join(directory, by=c('unitid' = 'UNITID'))

export_table <- files |>
  filter(year != 'no') |>
  filter(year >= 2020) |>
  select(INSTNM, STABBR, year, anchor) |> 
  group_by(INSTNM, STABBR, year) |>
  summarize(anchor = first(anchor)) |>
  pivot_wider(id_cols=c('INSTNM', 'STABBR'), names_from='year', values_from='anchor')

export_table <- export_table %>%
  replace(is.na(.), '<i class="fa-solid fa-upload file"></i>')

export_table |>
  head(n=20) |>
  kbl(escape=FALSE) |> 
  kable_styling() |> 
  cat(file = "df.html")
